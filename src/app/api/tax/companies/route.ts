import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_COMPANIES, PROVINCES } from '@/lib/constants';
import { getCompaniesByProvince, fetchLiveNationwideCompanies, fetchLiveProvinceCompanies, getHarvestedStartDate } from '@/lib/provinceCompanies';
import { saveCompaniesBatchToDb } from '@/lib/companyDb';
import { BusinessTaxInfo } from '@/types/tax';
import { scanCompanyContactAI } from '@/lib/companyAiScanner';

// In-memory cache for live fetched pages (TTL: 10 minutes)
const liveCache = new Map<string, { data: BusinessTaxInfo[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

function mergeUniqueCompanies(...lists: BusinessTaxInfo[][]): BusinessTaxInfo[] {
  const unique = new Map<string, BusinessTaxInfo>();
  lists.flat().forEach((company) => unique.set(company.id, company));
  return Array.from(unique.values());
}

async function attachWebsiteStatus(companies: BusinessTaxInfo[]): Promise<BusinessTaxInfo[]> {
  // Limit concurrent domain probes so the admin filter remains responsive and
  // does not overload the website checker when a province has many companies.
  const enriched: BusinessTaxInfo[] = [];
  const batchSize = 5;

  for (let index = 0; index < companies.length; index += batchSize) {
    const batch = companies.slice(index, index + batchSize);
    const scanned = await Promise.all(batch.map(async (company) => ({
      ...company,
      contactInfo: await scanCompanyContactAI({
        id: company.id,
        name: company.name,
        shortName: company.shortName,
        internationalName: company.internationalName,
        address: company.address,
        phone: company.phone,
        representative: company.representative
      })
    })));
    enriched.push(...scanned);
  }

  return enriched;
}

/**
 * Attempt to fetch real-time companies from live source for a province & page
 */
async function fetchLiveProvincePage(provinceSlug: string, page: number): Promise<BusinessTaxInfo[] | null> {
  const cacheKey = `${provinceSlug}_page_${page}`;
  const cached = liveCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `https://masothue.com/tra-cuu-ma-so-thue-theo-tinh/${provinceSlug}${page > 1 ? `?page=${page}` : ''}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.status === 200) {
      const html = await res.text();
      const list: BusinessTaxInfo[] = [];
      const blocks = html.split("<div data-prefetch='");

      for (let i = 1; i < blocks.length; i++) {
        const b = blocks[i];
        const nameMatch = b.match(/<h3><a[^>]*>([\s\S]*?)<\/a><\/h3>/i);
        const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        const taxIdMatch = b.match(/Mã số thuế:\s*<a[^>]*>([\s\S]*?)<\/a>/i);
        const taxId = taxIdMatch ? taxIdMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        const repMatch = b.match(/Người đại diện:\s*<em><a[^>]*>([\s\S]*?)<\/a><\/em>/i);
        const rep = repMatch ? repMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        const addrMatch = b.match(/<address>([\s\S]*?)<\/address>/i);
        const address = addrMatch ? addrMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        if (taxId && name) {
          list.push({
            id: taxId,
            name,
            representative: rep || undefined,
            address,
            status: 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
            industryName: undefined,
            startDate: getHarvestedStartDate(taxId) || undefined,
            registrationDate: getHarvestedStartDate(taxId) || undefined
          });
        }
      }

      if (list.length > 0) {
        liveCache.set(cacheKey, { data: list, timestamp: Date.now() });

        // Lưu doanh nghiệp vừa tải về vào MongoDB để kho dữ liệu tự lớn dần
        saveCompaniesBatchToDb(list).catch(() => {});

        return list;
      }
    }
  } catch {
    // Quietly fallback on timeout or rate limit
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provinceParam = searchParams.get('province') || 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '25', 10)));
  const query = searchParams.get('q')?.toLowerCase().trim() || '';
  const includeWebsite = searchParams.get('includeWebsite') === 'true';

  // 1. Nationwide listing (province === 'all')
  if (provinceParam === 'all') {
    const res = await fetchLiveNationwideCompanies(page, limit);
    // Keep the curated profiles in the nationwide dataset. These profiles have
    // AI-verified contact data, including their official websites.
    let filtered = mergeUniqueCompanies(res.companies, INITIAL_COMPANIES);
    if (query) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.id.includes(query) ||
        (c.representative && c.representative.toLowerCase().includes(query)) ||
        (c.address && c.address.toLowerCase().includes(query))
      );
    }

    // Mọi doanh nghiệp trả về đều được đẩy vào MongoDB: chưa có thì thêm mới,
    // đã có thì chỉ bổ sung trường còn thiếu. Kho dữ liệu tự lớn dần qua mỗi lượt gọi.
    if (filtered.length > 0) {
      saveCompaniesBatchToDb(filtered).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      source: res.source || 'live-upstream-api',
      page: res.page,
      limit: res.pageSize,
      total: res.total,
      totalPages: res.totalPages,
      province: { name: 'Toàn quốc', slug: 'all' },
      data: includeWebsite ? await attachWebsiteStatus(filtered) : filtered
    });
  }

  // 2. Specific province
  const matchedProv = PROVINCES.find(p =>
    p.slug === provinceParam ||
    provinceParam.includes(p.slug) ||
    p.slug.includes(provinceParam) ||
    p.name.toLowerCase() === provinceParam.toLowerCase()
  );

  const provSlug = matchedProv ? matchedProv.slug : provinceParam;
  const provName = matchedProv ? matchedProv.name : provinceParam;

  // Tra cứu theo tỉnh thành từ MongoDB Atlas / Masothue (ưu tiên DN mới nhất)
  const provResult = await fetchLiveProvinceCompanies(provSlug, page, limit);
  let finalCompanies = provResult.companies;
  const source = provResult.source || 'mongodb-live-database';

  if (query) {
    finalCompanies = finalCompanies.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.id.includes(query) ||
      (c.representative && c.representative.toLowerCase().includes(query))
    );
  }

  if (finalCompanies.length > 0) {
    saveCompaniesBatchToDb(finalCompanies).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    source: source,
    page: provResult.page,
    limit: provResult.pageSize,
    total: provResult.total,
    totalPages: provResult.totalPages,
    province: {
      name: provName,
      slug: provSlug,
      code: matchedProv?.code || '01',
      region: matchedProv?.region || 'Toàn quốc'
    },
    data: includeWebsite ? await attachWebsiteStatus(finalCompanies) : finalCompanies
  });
}
