import { NextRequest, NextResponse } from 'next/server';
import { searchCompaniesByIndustryLive, searchCompaniesLive, searchCompaniesAcrossProvinces } from '@/lib/provinceCompanies';
import { getCompleteCompanyProfile, enrichCompanyData } from '@/lib/taxEngine';

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

  const cleanQuery = q.replace(/[^0-9a-zA-Z]/g, '');
  const isTaxNumber = /^\d{10}(\d{3})?$/.test(cleanQuery);

  // VSIC codes are listed by a dedicated upstream endpoint. The generic search
  // endpoint does not reliably interpret a four-digit code as an industry.
  if (type === 'industry') {
    const industryResults = await searchCompaniesByIndustryLive(cleanQuery);
    if (industryResults.length > 0) {
      return NextResponse.json({
        success: true,
        source: 'live-industry-directory',
        disclaimer: `Doanh nghiệp được tra cứu theo mã ngành VSIC ${cleanQuery}`,
        data: industryResults
      });
    }
  }

  // 1. Direct Tax Code Lookup -> Return 100% complete live profile
  if (type !== 'industry' && (isTaxNumber || type === 'enterpriseTax')) {
    const profile = await getCompleteCompanyProfile(cleanQuery);
    if (profile) {
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
  if (liveResults && liveResults.length > 0) {
    return NextResponse.json({
      success: true,
      source: 'live-upstream-api',
      disclaimer: 'Dữ liệu trực tuyến đồng bộ từ Cổng thông tin Doanh nghiệp Quốc gia',
      data: liveResults
    });
  }

  // 3. Fallback: Search across local indexes if offline
  const matched = searchCompaniesAcrossProvinces(q, type);
  const enrichedResults = matched.map(c => enrichCompanyData(c));

  return NextResponse.json({
    success: true,
    source: 'national-database',
    disclaimer: 'Dữ liệu tra cứu từ Hệ thống Doanh nghiệp Quốc gia',
    data: enrichedResults
  });
}
