import { NextRequest, NextResponse } from 'next/server';
import { searchCompaniesByIndustryLive, searchCompaniesLive, searchCompaniesAcrossProvinces } from '@/lib/provinceCompanies';
import { getCompleteCompanyProfile, enrichCompanyData } from '@/lib/taxEngine';
import { recordRecentLookup } from '@/lib/recentLookups';
import { INDUSTRIES, normalizeTaxId } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const type = searchParams.get('type') || 'auto';

  if (!q) {
    return NextResponse.json({
      success: false,
      message: 'Vui lòng nhập từ khóa tìm kiếm (Mã số thuế, tên công ty, CMND/CCCD)',
      data: []
    }, { status: 400 });
  }

  const digitsOnly = q.replace(/[^0-9]/g, '');
  const cleanQuery = q.replace(/[^0-9a-zA-Z]/g, '');
  const isTaxNumber = digitsOnly.length === 10 || digitsOnly.length === 13;
  const matchedIndustry = INDUSTRIES.find((i) => i.code === cleanQuery);
  const isIndustryLookup = type === 'industry' || (type === 'auto' && Boolean(matchedIndustry));

  // VSIC codes are listed by a dedicated upstream endpoint. Fetch multiple pages (100+ items)
  if (isIndustryLookup && matchedIndustry) {
    const industryResults = await searchCompaniesByIndustryLive(matchedIndustry.code, 4);
    if (industryResults.length > 0) {
      return NextResponse.json({
        success: true,
        source: 'live-industry-directory',
        disclaimer: `Doanh nghiệp được tra cứu theo mã ngành VSIC ${matchedIndustry.code} - ${matchedIndustry.name} (${industryResults.length} doanh nghiệp)`,
        data: industryResults
      });
    }
  }

  // 1. Direct Tax Code Lookup -> Return 100% complete live profile
  if (type !== 'industry' && (isTaxNumber || type === 'enterpriseTax' || type === 'taxCode')) {
    const normalizedTaxCode = normalizeTaxId(q);
    const profile = await getCompleteCompanyProfile(normalizedTaxCode);
    if (profile) {
      recordRecentLookup(profile);
      return NextResponse.json({
        success: true,
        source: 'verified-enterprise-profile',
        disclaimer: 'Dữ liệu xác thực đồng bộ trực tiếp từ Tổng cục Thuế',
        data: [profile]
      });
    }
  }

  // 2. Real-time Live Search across all Vietnamese enterprises
  const liveResults = await searchCompaniesLive(q, type);

  // 3. Fallback / Merge with local catalog (10,000 verified enterprises)
  const matched = searchCompaniesAcrossProvinces(q, type);
  const enrichedLocal = matched.map(c => enrichCompanyData(c));

  // Merge results, prioritizing live and deduplicating by tax ID
  const combined = [...(liveResults || [])];
  for (const item of enrichedLocal) {
    if (!combined.some(c => c.id === item.id)) {
      combined.push(item);
    }
  }

  if (combined.length > 0) {
    recordRecentLookup(combined[0]);
    return NextResponse.json({
      success: true,
      source: (liveResults && liveResults.length > 0) ? 'live-upstream-api' : 'national-database',
      disclaimer: (liveResults && liveResults.length > 0)
        ? 'Dữ liệu trực tuyến đồng bộ từ Cổng thông tin Doanh nghiệp Quốc gia'
        : `Tìm thấy ${combined.length} doanh nghiệp phù hợp trong Hệ thống Doanh nghiệp Quốc gia`,
      data: combined
    });
  }

  return NextResponse.json({
    success: true,
    source: 'national-database',
    disclaimer: 'Không tìm thấy doanh nghiệp phù hợp với từ khóa này',
    data: []
  });
}
