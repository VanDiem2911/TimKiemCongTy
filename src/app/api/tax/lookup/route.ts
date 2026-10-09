import { NextRequest, NextResponse, after } from 'next/server';
import { logActivity } from '@/lib/activityLog';
import { searchCompaniesByIndustryLive, searchCompaniesLive, searchCompaniesAcrossProvinces, fillMissingFactsFromDb } from '@/lib/provinceCompanies';
import { getCompleteCompanyProfile, enrichCompanyData } from '@/lib/taxEngine';
import { recordRecentLookupAsync } from '@/lib/recentLookups';
import { INDUSTRIES, normalizeTaxId } from '@/lib/constants';
import { saveCompaniesBatchToDb, searchCompaniesInDb } from '@/lib/companyDb';

// Kết quả tra cứu thay đổi chậm nên cho phép đệm lại ở CDN / trình duyệt,
// đồng thời phục vụ bản cũ trong lúc làm mới ngầm để không ai phải chờ.
const SEARCH_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
};

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

  after(() => logActivity({ channel: 'api', feature: 'Tra cứu', action: 'search', summary: `Tìm kiếm "${q}"`, target: q }, request.headers));

  const digitsOnly = q.replace(/[^0-9]/g, '');
  const cleanQuery = q.replace(/[^0-9a-zA-Z]/g, '');
  const isTaxNumber = digitsOnly.length === 10 || digitsOnly.length === 13;
  let matchedIndustry = INDUSTRIES.find((i) => i.code === cleanQuery);
  if (!matchedIndustry && cleanQuery && cleanQuery.length >= 2) {
    matchedIndustry = INDUSTRIES.find((i) => i.code.startsWith(cleanQuery));
  }
  if (!matchedIndustry && (type === 'industry' || type === 'auto')) {
    const normQ = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
    if (normQ.length >= 2) {
      matchedIndustry = INDUSTRIES.find((i) => {
        const indNorm = i.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
        return indNorm.includes(normQ) || normQ.includes(indNorm);
      });
    }
  }
  const isIndustryLookup = type === 'industry' || (type === 'auto' && Boolean(matchedIndustry));

  // VSIC codes are listed by a dedicated upstream endpoint. Fetch multiple pages (100+ items)
  if (isIndustryLookup && matchedIndustry) {
    const industryResults = await searchCompaniesByIndustryLive(matchedIndustry.code, 4);
    if (industryResults.length > 0) {
      // Lưu doanh nghiệp vừa tải về vào MongoDB để kho dữ liệu tự lớn dần
      saveCompaniesBatchToDb(industryResults).catch(() => {});

      return NextResponse.json({
        success: true,
        source: 'live-industry-directory',
        disclaimer: `Doanh nghiệp được tra cứu theo mã ngành VSIC ${matchedIndustry.code} - ${matchedIndustry.name} (${industryResults.length} doanh nghiệp)`,
        data: industryResults
      }, { headers: SEARCH_CACHE_HEADERS });
    }
  }

  // 1. Direct Tax Code Lookup -> Return 100% complete live profile
  if (type !== 'industry' && (isTaxNumber || type === 'enterpriseTax' || type === 'taxCode')) {
    const normalizedTaxCode = normalizeTaxId(q);
    const profile = await getCompleteCompanyProfile(normalizedTaxCode);
    if (profile) {
      after(() => recordRecentLookupAsync(profile));
      return NextResponse.json({
        success: true,
        source: 'verified-enterprise-profile',
        disclaimer: 'Dữ liệu xác thực đồng bộ trực tiếp từ Tổng cục Thuế',
        data: [profile]
      }, { headers: SEARCH_CACHE_HEADERS });
    }
  }

  // 2. Tra song song ba nguồn: trang nguồn trực tuyến, kho MongoDB của chính
  // mình, và danh mục dựng sẵn trong mã nguồn. Endpoint tìm kiếm của trang
  // nguồn thường bị chặn (403) nên kho MongoDB mới là nguồn kết quả chính.
  const [liveResults, dbResults] = await Promise.all([
    searchCompaniesLive(q, type),
    searchCompaniesInDb(q, type, 40),
  ]);

  const matched = searchCompaniesAcrossProvinces(q, type);
  const enrichedLocal = matched.map(c => enrichCompanyData(c));

  // Gộp kết quả, ưu tiên dữ liệu trực tuyến rồi tới kho, bỏ trùng theo mã số thuế
  const combined: typeof enrichedLocal = [];
  const seenIds = new Set<string>();
  for (const item of [...(liveResults || []), ...dbResults, ...enrichedLocal]) {
    if (!item?.id || seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    combined.push(item);
  }

  if (combined.length > 0) {
    // Trang nguồn không kèm tình trạng và ngày thành lập trong kết quả tìm kiếm,
    // nên bổ sung từ kho đã tích lũy trước khi trả về cho người dùng.
    await fillMissingFactsFromDb(combined);

    // Lưu toàn bộ doanh nghiệp vừa tra được vào MongoDB; bản ghi nào chưa có
    // sẽ được thêm mới, bản ghi đã có chỉ được bổ sung thêm trường còn thiếu.
    saveCompaniesBatchToDb(combined).catch(() => {});

    after(() => recordRecentLookupAsync(combined[0]));
    return NextResponse.json({
      success: true,
      source: (liveResults && liveResults.length > 0) ? 'live-upstream-api' : 'national-database',
      disclaimer: (liveResults && liveResults.length > 0)
        ? 'Dữ liệu trực tuyến đồng bộ từ Cổng thông tin Doanh nghiệp Quốc gia'
        : `Tìm thấy ${combined.length} doanh nghiệp phù hợp trong Hệ thống Doanh nghiệp Quốc gia`,
      data: combined
    }, { headers: SEARCH_CACHE_HEADERS });
  }

  return NextResponse.json({
    success: true,
    source: 'national-database',
    disclaimer: 'Không tìm thấy doanh nghiệp phù hợp với từ khóa này',
    data: []
  }, { headers: SEARCH_CACHE_HEADERS });
}
