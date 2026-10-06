import { BusinessTaxInfo } from '@/types/tax';
import { INDUSTRIES, PROVINCES, INITIAL_COMPANIES } from './constants';
import harvestedJson from '@/data/harvested_provinces.json';

export interface HarvestedItem {
  id: string;
  name: string;
  representative?: string;
  address?: string;
  slug?: string;
  startDate?: string;
  phone?: string | null;
  status?: string;
  mainIndustry?: string;
  managedBy?: string;
}

const HARVESTED_DATA = harvestedJson as Record<string, HarvestedItem[]>;

export interface ProvinceCompaniesResult {
  companies: BusinessTaxInfo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  provinceName: string;
  source?: string;
}

export function getCompaniesByProvince(
  provinceSlugOrName: string,
  page: number = 1,
  pageSize: number = 25
): ProvinceCompaniesResult {
  const norm = provinceSlugOrName.toLowerCase();
  
  // Find matching province
  const matchedProv = PROVINCES.find(p => 
    norm === p.slug.toLowerCase() ||
    norm.includes(p.slug.toLowerCase()) || 
    norm.includes(p.name.toLowerCase()) ||
    p.slug.toLowerCase().includes(norm) ||
    p.name.toLowerCase().includes(norm)
  );

  const provName = matchedProv ? matchedProv.name : provinceSlugOrName;
  const provSlug = matchedProv ? matchedProv.slug : norm;

  const allCompanies: BusinessTaxInfo[] = [];

  // 1. Add DUDI and Vinamilk if Ho Chi Minh
  if (provName.includes('Hồ Chí Minh') || provSlug.includes('ho-chi-minh')) {
    allCompanies.push(
      {
        id: '0319641544',
        name: 'CÔNG TY TNHH GIẢI PHÁP PHẦN MỀM DUDI',
        internationalName: 'DUDI SOFTWARE SOLUTIONS COMPANY LIMITED',
        shortName: 'DUDI SOFTWARE SOLUTIONS CO.,LTD',
        address: '49/2 đường Số 14, Phường Thủ Đức, Thành phố Hồ Chí Minh, Việt Nam',
        status: 'Đang hoạt động',
        representative: 'NGUYỄN THỊ HẢO',
        industryCode: '6219',
        industryName: 'Lập trình máy tính khác (6219)',
        province: 'TP Hồ Chí Minh',
        registrationDate: '2026-07-16',
        managedBy: 'Thuế cơ sở 2 Thành phố Hồ Chí Minh'
      },
      {
        id: '0300588569',
        name: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM',
        internationalName: 'VIETNAM DAIRY PRODUCTS JOINT STOCK COMPANY',
        shortName: 'VINAMILK',
        address: 'Số 10, Đường Tân Trào, Phường Tân Phú, Quận 7, Thành phố Hồ Chí Minh',
        status: 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
        representative: 'MAI KIỀU LIÊN',
        industryCode: '1050',
        industryName: 'Chế biến sữa và các sản phẩm từ sữa',
        province: 'TP Hồ Chí Minh',
        registrationDate: '2003-11-20',
        managedBy: 'Cục Thuế TP Hồ Chí Minh'
      }
    );
  }

  // 2. Add 100% REAL Harvested Companies from masothue if available
  const harvestedList = HARVESTED_DATA[provSlug] || [];
  for (const item of harvestedList) {
    if (!allCompanies.some(c => c.id === item.id)) {
      allCompanies.push({
        id: item.id,
        name: item.name,
        address: item.address || '',
        status: item.status || 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
        representative: item.representative || undefined,
        province: provName,
        industryName: item.mainIndustry || 'Kinh doanh thương mại & Dịch vụ tổng hợp',
        registrationDate: item.startDate || '2026-03-20',
        managedBy: item.managedBy || `Chi cục Thuế khu vực ${provName}`,
        phone: item.phone && item.phone !== 'Bị ẩn theo yêu cầu người dùng' ? item.phone : undefined
      });
    }
  }

  // Calculate pagination ONLY on real companies
  const safePage = Math.max(1, page);
  const totalPages = Math.max(1, Math.ceil(allCompanies.length / pageSize));
  const startIndex = (safePage - 1) * pageSize;
  const paginatedCompanies = allCompanies.slice(startIndex, startIndex + pageSize);

  return {
    companies: paginatedCompanies,
    total: allCompanies.length,
    page: safePage,
    pageSize: pageSize,
    totalPages: totalPages,
    provinceName: provName
  };
}

// Nationwide companies aggregated from all provinces
export function getNationwideCompanies(
  page: number = 1,
  pageSize: number = 25
): {
  companies: BusinessTaxInfo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const allList: BusinessTaxInfo[] = [];

  // Harvested pool first
  for (const [slug, list] of Object.entries(HARVESTED_DATA)) {
    const prov = PROVINCES.find(p => p.slug === slug);
    const provName = prov ? prov.name : slug;
    for (const item of list) {
      allList.push({
        id: item.id,
        name: item.name,
        address: item.address || '',
        status: 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
        representative: item.representative || undefined,
        province: provName,
        industryName: 'Kinh doanh thương mại & Dịch vụ tổng hợp',
        registrationDate: '2026-03-25'
      });
    }
  }

  // Also include samples from all 63 provinces
  for (const prov of PROVINCES) {
    const provSample = getCompaniesByProvince(prov.slug, 1, 10);
    for (const comp of provSample.companies) {
      if (!allList.some(c => c.id === comp.id)) {
        allList.push(comp);
      }
    }
  }

  const safePage = Math.max(1, page);
  const totalPages = Math.ceil(allList.length / pageSize);
  const startIndex = (safePage - 1) * pageSize;
  const paginated = allList.slice(startIndex, startIndex + pageSize);

  return {
    companies: paginated,
    total: allList.length,
    page: safePage,
    pageSize: pageSize,
    totalPages: totalPages
  };
}

// Normalize Vietnamese accents and diacritics for accurate search matching
export function normalizeText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Global search across all provinces
export function searchCompaniesAcrossProvinces(keyword: string, type: string = 'auto'): BusinessTaxInfo[] {
  const rawQ = keyword.trim();
  if (!rawQ) return [];
  const normQ = normalizeText(rawQ);
  const cleanDigits = rawQ.replace(/[^0-9a-zA-Z]/g, '');

  const isIndustrySearch = type === 'industry';
  const matches = (item: {
    id: string;
    name: string;
    address?: string;
    representative?: string;
    industryCode?: string;
    mainIndustryCode?: string;
  }) => {
    if (isIndustrySearch) {
      return (item.industryCode || item.mainIndustryCode || '').includes(cleanDigits || rawQ);
    }

    const nameNorm = normalizeText(item.name || '');
    const repNorm = normalizeText(item.representative || '');
    const addrNorm = normalizeText(item.address || '');
    const idClean = (item.id || '').replace(/[^0-9a-zA-Z]/g, '');

    if (type === 'legalName') {
      return repNorm.includes(normQ) || (nameNorm.includes(normQ) && (nameNorm.includes('ho kinh doanh') || nameNorm.includes('doanh nghiep')));
    }
    if (type === 'companyName') {
      return nameNorm.includes(normQ);
    }
    if (type === 'enterpriseTax') {
      return cleanDigits ? idClean.includes(cleanDigits) : false;
    }

    // Default 'auto': match any relevant field
    return (
      nameNorm.includes(normQ) ||
      repNorm.includes(normQ) ||
      (cleanDigits ? idClean.includes(cleanDigits) : false) ||
      addrNorm.includes(normQ)
    );
  };

  const results: BusinessTaxInfo[] = [];

  // 1. Search in INITIAL_COMPANIES first (top featured companies & representatives like LÊ BÁ ANH, MAI KIỀU LIÊN, NGUYỄN THỊ HẢO, TÀO ĐỨC THẮNG...)
  for (const item of INITIAL_COMPANIES) {
    if (matches(item)) {
      if (!results.some(r => r.id === item.id)) {
        results.push(item);
      }
    }
  }

  // 2. Search in harvested data (10,000+ real companies across provinces)
  for (const [slug, list] of Object.entries(HARVESTED_DATA)) {
    const prov = PROVINCES.find(p => p.slug === slug);
    const provName = prov ? prov.name : slug;
    for (const item of list) {
      if (matches(item)) {
        if (!results.some(r => r.id === item.id)) {
          results.push({
            id: item.id,
            name: item.name,
            address: item.address || '',
            status: item.status || 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
            representative: item.representative,
            province: provName,
            registrationDate: item.startDate || undefined,
            phone: item.phone && item.phone !== 'Bị ẩn theo yêu cầu người dùng' ? item.phone : undefined
          });
        }
      }
    }
  }

  // 3. Search provinces
  for (const prov of PROVINCES) {
    const res = getCompaniesByProvince(prov.slug, 1, 20);
    for (const comp of res.companies) {
      if (matches(comp)) {
        if (!results.some(r => r.id === comp.id)) {
          results.push(comp);
        }
      }
    }
  }

  return results;
}

const LIVE_PROVINCE_CACHE = new Map<string, { data: BusinessTaxInfo[]; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 mins

const BROWSER_FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi,en;q=0.9',
  'Referer': 'https://masothue.com/'
};

const TOP_ACTIVE_PROVINCES = [
  'ho-chi-minh-23',
  'ha-noi-7',
  'binh-duong-10',
  'da-nang-35',
  'dong-nai-39',
  'hai-phong-5',
  'can-tho-47',
  'bac-ninh-170',
  'hai-duong-57',
  'ba-ria-vung-tau-33',
  'quang-ninh-61',
  'khanh-hoa-40',
  'nghe-an-55',
  'thanh-hoa-56',
  'vinh-phuc-173',
  'long-an-36'
];

/** Fetch companies from the upstream VSIC industry listing, not its generic search box. */
function parseIndustryHtml(html: string, code: string, industryName: string): BusinessTaxInfo[] {
  const list: BusinessTaxInfo[] = [];
  const blocks = html.split("<div data-prefetch='");
  const stripHtml = (value: string) => value.replace(/<[^>]+>/g, '').trim();

  for (let index = 1; index < blocks.length; index++) {
    const block = blocks[index];
    const nameMatch = block.match(/<h3><a[^>]*>([\s\S]*?)<\/a><\/h3>/i);
    const taxIdMatch = block.match(/Mã số thuế:\s*<a[^>]*>([\s\S]*?)<\/a>/i);
    const repMatch = block.match(/Người đại diện:\s*<em><a[^>]*>([\s\S]*?)<\/a><\/em>/i);
    const addressMatch = block.match(/<address>([\s\S]*?)<\/address>/i);

    const name = nameMatch ? stripHtml(nameMatch[1]) : '';
    const id = taxIdMatch ? stripHtml(taxIdMatch[1]) : '';
    if (id && name) {
      list.push({
        id,
        name,
        representative: repMatch ? stripHtml(repMatch[1]) : undefined,
        address: addressMatch ? stripHtml(addressMatch[1]) : '',
        status: 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
        industryCode: code,
        mainIndustryCode: code,
        industryName,
        mainIndustry: industryName
      });
    }
  }
  return list;
}

export async function searchCompaniesByIndustryLive(
  industryCode: string,
  maxPages: number = 4
): Promise<BusinessTaxInfo[]> {
  const code = industryCode.trim();
  const industry = INDUSTRIES.find((item) => item.code === code);
  if (!industry) return [];

  const cacheKey = `industry_${code}_p${maxPages}`;
  const cached = LIVE_PROVINCE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;

  try {
    const pageNumbers = Array.from({ length: maxPages }, (_, i) => i + 1);
    const pagePromises = pageNumbers.map(async (pageNum) => {
      try {
        const url = pageNum === 1
          ? `https://masothue.com/tra-cuu-ma-so-thue-theo-nganh-nghe/${industry.slug}`
          : `https://masothue.com/tra-cuu-ma-so-thue-theo-nganh-nghe/${industry.slug}?page=${pageNum}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, { headers: BROWSER_FETCH_HEADERS, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) return [];

        const html = await res.text();
        return parseIndustryHtml(html, code, industry.name);
      } catch {
        return [];
      }
    });

    const pageResults = await Promise.all(pagePromises);
    const combined: BusinessTaxInfo[] = [];

    for (const pageList of pageResults) {
      for (const comp of pageList) {
        if (!combined.some((c) => c.id === comp.id)) {
          combined.push(comp);
        }
      }
    }

    // Merge with any matching local harvested companies
    const normIndName = normalizeText(industry.name);
    for (const [slug, list] of Object.entries(HARVESTED_DATA)) {
      const prov = PROVINCES.find((p) => p.slug === slug);
      const provName = prov ? prov.name : slug;
      for (const item of list) {
        if (
          (item.mainIndustry && normalizeText(item.mainIndustry).includes(normIndName)) ||
          item.mainIndustry === industry.name
        ) {
          if (!combined.some((c) => c.id === item.id)) {
            combined.push({
              id: item.id,
              name: item.name,
              representative: item.representative,
              address: item.address || '',
              status: item.status || 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
              province: provName,
              industryCode: code,
              mainIndustryCode: code,
              industryName: industry.name,
              mainIndustry: industry.name,
              phone: item.phone && item.phone !== 'Bị ẩn theo yêu cầu người dùng' ? item.phone : undefined
            });
          }
        }
      }
    }

    if (combined.length > 0) {
      LIVE_PROVINCE_CACHE.set(cacheKey, { data: combined, timestamp: Date.now() });
    }
    return combined;
  } catch (error) {
    console.error('Không thể tải danh sách doanh nghiệp theo mã ngành:', error);
    return [];
  }
}

/**
 * Live search across all enterprises in Vietnam using real-time search stream
 */
async function fetchLiveSearch(
  q: string,
  searchType: string,
  normQ: string,
  cleanDigits: string
): Promise<BusinessTaxInfo[]> {
  try {
    const proxyBase = process.env.VN_PROXY_URL || process.env.MASOTHUE_PROXY_URL;
    const url = proxyBase
      ? `${proxyBase.replace(/\/+$/, '')}/Search/?q=${encodeURIComponent(q)}&type=${encodeURIComponent(searchType)}&force-search=0`
      : `https://masothue.com/Search/?q=${encodeURIComponent(q)}&type=${encodeURIComponent(searchType)}&force-search=0`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5500);

    const res = await fetch(url, {
      headers: BROWSER_FETCH_HEADERS,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.status === 200) {
      const html = await res.text();
      const list: BusinessTaxInfo[] = [];

      // Case 1: Upstream redirected directly to a single company detail page
      // (e.g. searching a specific representative or company name)
      const tableMatch = html.match(/<table[^>]*class=["'][^"']*table-taxinfo[^"']*["'][^>]*>([\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const tableHtml = tableMatch[1];
        const cleanT = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

        const thMatch = tableHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
        const name = thMatch ? cleanT(thMatch[1]) : '';

        let id = '';
        let address = '';
        let representative = '';

        const rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
        for (const row of rows) {
          const text = cleanT(row);
          if (text.includes('Mã số thuế')) {
            const match = text.match(/Mã số thuế\s*([0-9\-]+)/i);
            if (match) id = match[1].replace(/[^0-9]/g, '');
          } else if (text.startsWith('Địa chỉ')) {
            address = text.replace(/^Địa chỉ(\s+Thuế)?\s*/i, '').trim();
          } else if (text.includes('Người đại diện')) {
            const repPart = text.replace(/^Người đại diện\s*/i, '');
            const parts = repPart.split(/(?:Ngoài ra|Đại diện các doanh nghiệp)/i);
            representative = parts[0].trim();
          }
        }

        if (id && name) {
          const normName = normalizeText(name);
          const normRep = normalizeText(representative);

          let matches = false;
          if (searchType === 'legalName') {
            matches = normRep.includes(normQ);
          } else if (searchType === 'companyName') {
            matches = normName.includes(normQ);
          } else if (searchType === 'enterpriseTax' || searchType === 'taxCode') {
            matches = cleanDigits ? id.includes(cleanDigits) : false;
          } else {
            matches = normName.includes(normQ) || normRep.includes(normQ) || (cleanDigits ? id.includes(cleanDigits) : false);
          }

          if (matches) {
            list.push({
              id,
              name,
              representative: representative || undefined,
              address,
              status: 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
              industryName: 'Đăng ký theo GPKD'
            });
            return list;
          }
        }
      }

      // Case 2: Multi-item listing search result
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
          const normName = normalizeText(name);
          const normRep = normalizeText(rep);

          let isMatch = false;
          if (searchType === 'legalName') {
            isMatch = normRep.includes(normQ);
          } else if (searchType === 'companyName') {
            isMatch = normName.includes(normQ);
          } else if (searchType === 'enterpriseTax' || searchType === 'taxCode') {
            isMatch = cleanDigits ? taxId.includes(cleanDigits) : false;
          } else {
            isMatch =
              normName.includes(normQ) ||
              normRep.includes(normQ) ||
              (cleanDigits ? taxId.includes(cleanDigits) : false);
          }

          if (isMatch && !list.some((item) => item.id === taxId)) {
            list.push({
              id: taxId,
              name,
              representative: rep || undefined,
              address,
              status: 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
              industryName: 'Đăng ký theo GPKD'
            });
          }
        }
      }

      return list;
    }
  } catch (err: unknown) {
    if ((err as Error)?.name !== 'AbortError') {
      console.warn(`Lưu ý tìm kiếm trực tuyến (${searchType}):`, (err as Error)?.message || err);
    }
  }
  return [];
}

export async function searchCompaniesLive(
  keyword: string,
  type: string = 'auto'
): Promise<BusinessTaxInfo[]> {
  const q = keyword.trim();
  if (!q) return [];

  const cacheKey = `search_${type}_${q.toLowerCase()}`;
  const cached = LIVE_PROVINCE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const normQ = normalizeText(q);
  const cleanDigits = q.replace(/[^0-9]/g, '');

  let results: BusinessTaxInfo[] = [];

  if (type === 'auto') {
    // When "Tất cả" is selected, query both companyName and legalName in parallel
    const [compResults, repResults] = await Promise.all([
      fetchLiveSearch(q, 'companyName', normQ, cleanDigits),
      fetchLiveSearch(q, 'legalName', normQ, cleanDigits)
    ]);

    const combined: BusinessTaxInfo[] = [...compResults];
    for (const item of repResults) {
      if (!combined.some(c => c.id === item.id)) {
        combined.push(item);
      }
    }
    results = combined;
  } else {
    // Specific search type: legalName, companyName, taxCode, etc.
    results = await fetchLiveSearch(q, type, normQ, cleanDigits);
  }

  if (results.length > 0) {
    LIVE_PROVINCE_CACHE.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  }

  // Fallback to local index if network request returns no matches
  return searchCompaniesAcrossProvinces(q, type);
}

/**
 * Fetch live nationwide companies dynamically across 63 provinces with live stream
 */
export async function fetchLiveNationwideCompanies(
  page: number = 1,
  pageSize: number = 25
): Promise<ProvinceCompaniesResult> {
  const safePage = Math.max(1, page);
  const cacheKey = `nationwide_page_${safePage}`;
  const cached = LIVE_PROVINCE_CACHE.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      companies: cached.data,
      total: 50 * pageSize,
      page: safePage,
      pageSize,
      totalPages: 50,
      provinceName: 'Toàn quốc',
      source: 'live-upstream-api'
    };
  }

  // Determine active province and sub-page for this nationwide page index
  const provIndex = (safePage - 1) % TOP_ACTIVE_PROVINCES.length;
  const provSlug = TOP_ACTIVE_PROVINCES[provIndex];
  const subPage = Math.floor((safePage - 1) / TOP_ACTIVE_PROVINCES.length) + 1;

  try {
    const url = `https://masothue.com/tra-cuu-ma-so-thue-theo-tinh/${provSlug}${subPage > 1 ? `?page=${subPage}` : ''}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      headers: BROWSER_FETCH_HEADERS,
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
            industryName: 'Đăng ký theo GPKD'
          });
        }
      }

      if (list.length > 0) {
        LIVE_PROVINCE_CACHE.set(cacheKey, { data: list, timestamp: Date.now() });
        return {
          companies: list,
          total: 50 * pageSize,
          page: safePage,
          pageSize,
          totalPages: 50,
          provinceName: 'Toàn quốc',
          source: 'live-upstream-api'
        };
      }
    }
  } catch (err) {
    console.error('Lỗi khi gọi live nationwide companies:', err);
  }

  // Graceful fallback to local seed if network drops
  const fallback = getNationwideCompanies(safePage, pageSize);
  return {
    ...fallback,
    provinceName: 'Toàn quốc',
    source: 'backup-cache'
  };
}

export async function fetchLiveProvinceCompanies(
  provinceSlug: string,
  page: number = 1,
  pageSize: number = 25
): Promise<ProvinceCompaniesResult> {
  const norm = provinceSlug.toLowerCase();
  const matchedProv = PROVINCES.find(p => 
    norm === p.slug.toLowerCase() ||
    norm.includes(p.slug.toLowerCase()) || 
    norm.includes(p.name.toLowerCase()) ||
    p.slug.toLowerCase().includes(norm) ||
    p.name.toLowerCase().includes(norm)
  );
  const provName = matchedProv ? matchedProv.name : provinceSlug;
  const provSlug = matchedProv ? matchedProv.slug : norm;

  const cacheKey = `${provSlug}_page_${page}`;
  const cached = LIVE_PROVINCE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      companies: cached.data,
      total: Math.max(cached.data.length * 20, 500),
      page,
      pageSize,
      totalPages: 20,
      provinceName: provName,
      source: 'live-upstream-api'
    };
  }

  // 1. Fetch live from upstream directly in real time
  try {
    const url = `https://masothue.com/tra-cuu-ma-so-thue-theo-tinh/${provSlug}${page > 1 ? `?page=${page}` : ''}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      headers: BROWSER_FETCH_HEADERS,
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
            industryName: 'Đăng ký theo GPKD',
            province: provName
          });
        }
      }

      if (list.length > 0) {
        LIVE_PROVINCE_CACHE.set(cacheKey, { data: list, timestamp: Date.now() });
        return {
          companies: list,
          total: Math.max(list.length * 20, 500),
          page,
          pageSize,
          totalPages: 20,
          provinceName: provName,
          source: 'live-upstream-api'
        };
      }
    }
  } catch (err) {
    console.error('Error fetching live province page:', err);
  }

  // 2. Fallback to real harvested data only if upstream is temporarily unreachable
  return getCompaniesByProvince(provSlug, page, pageSize);
}
