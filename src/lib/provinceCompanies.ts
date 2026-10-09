import { BusinessTaxInfo } from '@/types/tax';
import { INDUSTRIES, PROVINCES, INITIAL_COMPANIES, normalizeTaxId } from './constants';
import harvestedJson from '@/data/harvested_provinces.json';
import cachedIndustryJson from '@/data/cached_industry_companies.json';
import { getCompaniesByProvinceFromDb, saveCompaniesBatchToDb, getCompanyFactsByIds } from '@/lib/companyDb';

function parseDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

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
const CACHED_INDUSTRY_COMPANIES = (cachedIndustryJson || {}) as Record<string, BusinessTaxInfo[]>;

/**
 * Danh sách doanh nghiệp đã dựng + sắp xếp sẵn cho từng tỉnh.
 * Dữ liệu tĩnh nên chỉ cần dựng một lần rồi dùng lại cho mọi trang,
 * tránh map + sort lại toàn bộ tỉnh ở mỗi lần phân trang.
 */
const PROVINCE_LIST_CACHE = new Map<string, BusinessTaxInfo[]>();
let NATIONWIDE_CACHE: BusinessTaxInfo[] | null = null;

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

  const cachedList = PROVINCE_LIST_CACHE.get(provSlug);
  if (cachedList) {
    return paginateProvinceList(cachedList, page, pageSize, provName);
  }

  const allCompanies: BusinessTaxInfo[] = [];
  const seenIds = new Set<string>();

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

  for (const seeded of allCompanies) {
    seenIds.add(seeded.id);
  }

  // 2. Add 100% REAL Harvested Companies from masothue if available
  const harvestedList = HARVESTED_DATA[provSlug] || [];
  for (const item of harvestedList) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      allCompanies.push({
        id: item.id,
        name: item.name,
        address: item.address || '',
        status: item.status || 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
        representative: item.representative || undefined,
        province: provName,
        industryName: item.mainIndustry || undefined,
        startDate: item.startDate || undefined,
        registrationDate: item.startDate || undefined,
        managedBy: item.managedBy || `Chi cục Thuế khu vực ${provName}`,
        phone: item.phone && item.phone !== 'Bị ẩn theo yêu cầu người dùng' ? item.phone : undefined
      });
    }
  }

  // Sắp xếp các doanh nghiệp mới thành lập lên đầu danh sách
  allCompanies.sort((a, b) => {
    const dateA = a.startDate || a.registrationDate || '';
    const dateB = b.startDate || b.registrationDate || '';
    return dateB.localeCompare(dateA);
  });

  PROVINCE_LIST_CACHE.set(provSlug, allCompanies);

  return paginateProvinceList(allCompanies, page, pageSize, provName);
}

// Cắt trang trên danh sách đã dựng sẵn
function paginateProvinceList(
  list: BusinessTaxInfo[],
  page: number,
  pageSize: number,
  provName: string
): ProvinceCompaniesResult {
  const safePage = Math.max(1, page);
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const startIndex = (safePage - 1) * pageSize;

  return {
    companies: list.slice(startIndex, startIndex + pageSize),
    total: list.length,
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
  if (NATIONWIDE_CACHE) {
    const safe = Math.max(1, page);
    const start = (safe - 1) * pageSize;
    return {
      companies: NATIONWIDE_CACHE.slice(start, start + pageSize),
      total: NATIONWIDE_CACHE.length,
      page: safe,
      pageSize,
      totalPages: Math.ceil(NATIONWIDE_CACHE.length / pageSize)
    };
  }

  const allList: BusinessTaxInfo[] = [];
  const seenIds = new Set<string>();

  // Harvested pool first
  for (const [slug, list] of Object.entries(HARVESTED_DATA)) {
    const prov = PROVINCES.find(p => p.slug === slug);
    const provName = prov ? prov.name : slug;
    for (const item of list) {
      seenIds.add(item.id);
      allList.push({
        id: item.id,
        name: item.name,
        address: item.address || '',
        status: item.status || '',
        representative: item.representative || undefined,
        province: provName,
        industryName: item.mainIndustry || undefined,
        registrationDate: item.startDate || undefined
      });
    }
  }

  // Also include samples from all 63 provinces
  for (const prov of PROVINCES) {
    const provSample = getCompaniesByProvince(prov.slug, 1, 10);
    for (const comp of provSample.companies) {
      if (!seenIds.has(comp.id)) {
        seenIds.add(comp.id);
        allList.push(comp);
      }
    }
  }

  NATIONWIDE_CACHE = allList;

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

/**
 * Chỉ mục tìm kiếm dựng sẵn một lần duy nhất.
 * Trước đây mỗi lượt tìm phải chuẩn hóa lại tên / người đại diện / địa chỉ
 * của toàn bộ hàng chục nghìn doanh nghiệp, nay chỉ chuẩn hóa đúng một lần.
 */
interface IndexedCompany {
  company: BusinessTaxInfo;
  nameNorm: string;
  repNorm: string;
  addrNorm: string;
  idClean: string;
  industryCode: string;
  industryNorm: string;
}

let SEARCH_INDEX: IndexedCompany[] | null = null;

// Tra ngày thành lập và trạng thái thật đã thu thập được, theo mã số thuế
interface HarvestedFacts {
  startDate: string;
  status: string;
}

let HARVESTED_FACTS_BY_ID: Map<string, HarvestedFacts> | null = null;

function getHarvestedFacts(taxId: string): HarvestedFacts | undefined {
  if (!taxId) return undefined;

  if (!HARVESTED_FACTS_BY_ID) {
    const map = new Map<string, HarvestedFacts>();
    for (const list of Object.values(HARVESTED_DATA)) {
      for (const item of list) {
        if (map.has(item.id)) continue;
        map.set(item.id, {
          startDate: item.startDate ? parseDateToISO(item.startDate) : '',
          status: item.status || ''
        });
      }
    }
    HARVESTED_FACTS_BY_ID = map;
  }

  return HARVESTED_FACTS_BY_ID.get(taxId) || HARVESTED_FACTS_BY_ID.get(taxId.replace(/\D/g, ''));
}

export function getHarvestedStartDate(taxId: string): string {
  return getHarvestedFacts(taxId)?.startDate || '';
}

export function getHarvestedStatus(taxId: string): string {
  return getHarvestedFacts(taxId)?.status || '';
}

// Số kết quả tối đa trả về cho một lượt tìm kiếm
const MAX_SEARCH_RESULTS = 60;

function buildIndexEntry(company: BusinessTaxInfo): IndexedCompany {
  return {
    company,
    nameNorm: normalizeText(company.name || ''),
    repNorm: normalizeText(company.representative || ''),
    addrNorm: normalizeText(company.address || ''),
    idClean: (company.id || '').replace(/[^0-9a-zA-Z]/g, ''),
    industryCode: company.industryCode || company.mainIndustryCode || '',
    industryNorm: normalizeText(company.mainIndustry || company.industryName || '')
  };
}

function getSearchIndex(): IndexedCompany[] {
  if (SEARCH_INDEX) return SEARCH_INDEX;

  const index: IndexedCompany[] = [];
  const seen = new Set<string>();

  // 1. Doanh nghiệp tiêu biểu được ưu tiên lên đầu kết quả
  for (const item of INITIAL_COMPANIES) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    index.push(buildIndexEntry(item as BusinessTaxInfo));
  }

  // 2. Toàn bộ doanh nghiệp thật đã thu thập theo từng tỉnh
  for (const [slug, list] of Object.entries(HARVESTED_DATA)) {
    const prov = PROVINCES.find(p => p.slug === slug);
    const provName = prov ? prov.name : slug;
    for (const item of list) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      index.push(
        buildIndexEntry({
          id: item.id,
          name: item.name,
          address: item.address || '',
          status: item.status || 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
          representative: item.representative,
          province: provName,
          registrationDate: item.startDate || undefined,
          mainIndustry: item.mainIndustry,
          phone: item.phone && item.phone !== 'Bị ẩn theo yêu cầu người dùng' ? item.phone : undefined
        })
      );
    }
  }

  SEARCH_INDEX = index;
  return index;
}

// Global search across all provinces
export function searchCompaniesAcrossProvinces(keyword: string, type: string = 'auto'): BusinessTaxInfo[] {
  const rawQ = keyword.trim();
  if (!rawQ) return [];
  const normQ = normalizeText(rawQ);
  const cleanDigits = rawQ.replace(/[^0-9a-zA-Z]/g, '');

  const isIndustrySearch = type === 'industry';
  const targetIndustry = isIndustrySearch
    ? (INDUSTRIES.find(i => i.code === cleanDigits) || INDUSTRIES.find(i => normalizeText(i.name).includes(normQ)))
    : undefined;
  const indCode = targetIndustry ? targetIndustry.code : cleanDigits;
  const indNormName = targetIndustry ? normalizeText(targetIndustry.name) : '';
  const indKeywords = targetIndustry
    ? indNormName.split(/\s+/).filter(w => w.length > 2 && !['chua', 'duoc', 'phan', 'vao', 'dau', 'khac', 'hoat', 'dong', 'cac', 'loai'].includes(w))
    : [];

  const matches = (entry: IndexedCompany) => {
    if (isIndustrySearch) {
      if (entry.industryCode === indCode) return true;
      const mainInd = entry.industryNorm;
      if (mainInd) {
        if (indCode && mainInd.includes(indCode)) return true;
        if (indNormName && mainInd.includes(indNormName)) return true;
        if (indKeywords.length > 0 && indKeywords.some(kw => mainInd.includes(kw))) return true;
      }
      if (indKeywords.length >= 2 && indKeywords.every(kw => entry.nameNorm.includes(kw))) return true;
      return false;
    }

    if (type === 'legalName') {
      return (
        entry.repNorm.includes(normQ) ||
        (entry.nameNorm.includes(normQ) &&
          (entry.nameNorm.includes('ho kinh doanh') || entry.nameNorm.includes('doanh nghiep')))
      );
    }
    if (type === 'companyName') {
      return entry.nameNorm.includes(normQ);
    }
    if (type === 'enterpriseTax') {
      return cleanDigits ? entry.idClean.includes(cleanDigits) : false;
    }

    // Default 'auto': match any relevant field
    return (
      entry.nameNorm.includes(normQ) ||
      entry.repNorm.includes(normQ) ||
      (cleanDigits ? entry.idClean.includes(cleanDigits) : false) ||
      entry.addrNorm.includes(normQ)
    );
  };

  const results: BusinessTaxInfo[] = [];
  const seenIds = new Set<string>();

  // Doanh nghiệp đã gom sẵn theo mã ngành khi tìm theo ngành nghề
  if (isIndustrySearch && indCode && CACHED_INDUSTRY_COMPANIES[indCode]) {
    for (const comp of CACHED_INDUSTRY_COMPANIES[indCode]) {
      if (seenIds.has(comp.id)) continue;
      seenIds.add(comp.id);
      results.push(comp);
      if (results.length >= MAX_SEARCH_RESULTS) return results;
    }
  }

  for (const entry of getSearchIndex()) {
    if (seenIds.has(entry.company.id)) continue;
    if (!matches(entry)) continue;
    seenIds.add(entry.company.id);
    results.push(entry.company);
    if (results.length >= MAX_SEARCH_RESULTS) break;
  }

  return results;
}

const LIVE_PROVINCE_CACHE = new Map<string, { data: BusinessTaxInfo[]; timestamp: number }>();
// Số trang thật đọc được từ trang nguồn, theo từng khóa bộ nhớ đệm
const UPSTREAM_PAGES_CACHE = new Map<string, number>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 mins

const BROWSER_FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi,en;q=0.9',
  'Referer': 'https://masothue.com/'
};

/**
 * Gọi trang nguồn thông qua ScraperAPI để vượt qua lớp chặn bot.
 * Trả về null khi không dùng được, và luôn ghi rõ lý do ra log: trước đây lỗi
 * bị nuốt lặng lẽ nên hết credit hay sai key cũng không ai biết, chỉ thấy
 * kết quả tìm kiếm trống.
 */
// Danh sách key ScraperAPI, lấy từ nhiều biến môi trường hoặc một biến ngăn
// nhau bằng dấu phẩy. Có nhiều key để khi key này hết credit thì dùng key kia.
function getScraperApiKeys(): string[] {
  // Đọc mọi biến SCRAPER_API_KEY, SCRAPER_API_KEY_2, _3, _4... theo đúng thứ tự số.
  // Key đứng trước được dùng trước; hết credit thì chuyển sang key kế tiếp.
  const sources = Object.keys(process.env)
    .map((name) => {
      const m = /^SCRAPER_API_KEY(?:_(\d+))?$/.exec(name);
      return m ? { order: m[1] ? Number(m[1]) : 1, value: process.env[name] } : null;
    })
    .filter((x): x is { order: number; value: string | undefined } => x !== null)
    .sort((x, y) => x.order - y.order)
    .map((x) => x.value);

  const keys: string[] = [];
  for (const source of sources) {
    if (!source) continue;
    for (const part of source.split(',')) {
      const key = part.trim();
      if (key && !keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

// Key đã hết credit thì tạm ngừng dùng, tránh phí một lượt gọi hỏng cho mỗi
// yêu cầu. Sau khoảng thời gian này sẽ thử lại, phòng khi bạn vừa nạp thêm.
const EXHAUSTED_KEYS = new Map<string, number>();
const KEY_COOLDOWN_MS = 1000 * 60 * 30;

// Con trỏ xoay vòng giữa các key. Mỗi instance serverless bắt đầu ở vị trí ngẫu nhiên
// để tải dàn đều giữa các key ngay cả khi instance mới khởi động liên tục.
let nextKeyCursor = Math.floor(Math.random() * 1000);

function isKeyUsable(key: string): boolean {
  const until = EXHAUSTED_KEYS.get(key);
  if (!until) return true;
  if (Date.now() >= until) {
    EXHAUSTED_KEYS.delete(key);
    return true;
  }
  return false;
}

export async function fetchViaScraperApi(
  targetUrl: string,
  label: string,
  timeoutMs = 25000
): Promise<Response | null> {
  const keys = getScraperApiKeys();
  if (keys.length === 0) return null;

  const usable = keys.filter(isKeyUsable);
  if (usable.length === 0) {
    console.warn(`[ScraperAPI] ${label}: toàn bộ ${keys.length} key đều đang hết credit`);
    return null;
  }

  // Xoay vòng: mỗi lần gọi bắt đầu từ key kế tiếp (lần này key 2, lần sau key 3, ...).
  // Key nào lỗi thì thử tiếp key sau nó trong vòng; key hết credit đã bị loại khỏi `usable`.
  const start = nextKeyCursor++ % usable.length;
  const ordered = [...usable.slice(start), ...usable.slice(0, start)];

  for (let i = 0; i < ordered.length; i++) {
    const key = ordered[i];
    const keyLabel = `key ${keys.indexOf(key) + 1}/${keys.length}`;

    const params = new URLSearchParams({
      api_key: key,
      url: targetUrl,
      country_code: 'vn',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`https://api.scraperapi.com/?${params.toString()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 200) return res;

      const reason = await res.text().catch(() => '');

      // Hết credit hoặc key không hợp lệ thì ngừng dùng key này một thời gian
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        EXHAUSTED_KEYS.set(key, Date.now() + KEY_COOLDOWN_MS);
      }

      console.warn(
        `[ScraperAPI] ${label} - ${keyLabel} hỏng (mã ${res.status}): ${reason.slice(0, 150)}`
      );
    } catch (err) {
      clearTimeout(timeout);
      console.warn(
        `[ScraperAPI] ${label} - ${keyLabel} lỗi kết nối:`,
        (err as Error)?.message || err
      );
    }
  }

  return null;
}

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
        status: getHarvestedStatus(id) || '',
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

  // 1. Start with pre-cached verified companies if available
  const preCached = CACHED_INDUSTRY_COMPANIES[code] || [];
  const combined: BusinessTaxInfo[] = [...preCached];

  // 2. Attempt live upstream fetch (with Proxy and ScraperAPI support for cloud deployments)
  try {
    const proxyBase = process.env.VN_PROXY_URL || process.env.MASOTHUE_PROXY_URL;

    const pageNumbers = Array.from({ length: maxPages }, (_, i) => i + 1);
    const pagePromises = pageNumbers.map(async (pageNum) => {
      try {
        const directUrl = pageNum === 1
          ? `https://masothue.com/tra-cuu-ma-so-thue-theo-nganh-nghe/${industry.slug}`
          : `https://masothue.com/tra-cuu-ma-so-thue-theo-nganh-nghe/${industry.slug}?page=${pageNum}`;

        const targetUrl = proxyBase
          ? `${proxyBase.replace(/\/+$/, '')}/tra-cuu-ma-so-thue-theo-nganh-nghe/${industry.slug}${pageNum > 1 ? `?page=${pageNum}` : ''}`
          : directUrl;

        let res: Response | null = null;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          res = await fetch(targetUrl, { headers: BROWSER_FETCH_HEADERS, signal: controller.signal });
          clearTimeout(timeoutId);
        } catch {
          res = null;
        }

        // Trang nguồn chặn thì đi vòng qua ScraperAPI
        if (!res || res.status !== 200) {
          res = await fetchViaScraperApi(directUrl, `tra cứu ngành nghề trang ${pageNum}`);
        }

        if (!res || !res.ok) return [];

        const html = await res.text();
        return parseIndustryHtml(html, code, industry.name);
      } catch {
        return [];
      }
    });

    const pageResults = await Promise.all(pagePromises);
    for (const pageList of pageResults) {
      for (const comp of pageList) {
        if (!combined.some((c) => c.id === comp.id)) {
          combined.push(comp);
        }
      }
    }
  } catch (error) {
    console.warn('Live fetch for industry upstream error:', error);
  }

  // 3. Smart Fallback: Merge with matching local harvested companies if fewer than 10
  if (combined.length < 10) {
    const normIndName = normalizeText(industry.name);
    const indWords = normIndName
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['chua', 'duoc', 'phan', 'vao', 'dau', 'khac', 'hoat', 'dong', 'cac', 'loai', 'chat', 'trong'].includes(w));

    for (const [slug, list] of Object.entries(HARVESTED_DATA)) {
      const prov = PROVINCES.find((p) => p.slug === slug);
      const provName = prov ? prov.name : slug;
      for (const item of list) {
        const itemMainInd = item.mainIndustry ? normalizeText(item.mainIndustry) : '';
        const itemName = normalizeText(item.name || '');

        let isMatch = false;
        if (itemMainInd) {
          if (itemMainInd.includes(code) || itemMainInd.includes(normIndName)) {
            isMatch = true;
          } else if (indWords.length > 0 && indWords.some((w) => itemMainInd.includes(w))) {
            isMatch = true;
          }
        }
        if (!isMatch && indWords.length >= 2 && indWords.every((w) => itemName.includes(w))) {
          isMatch = true;
        }

        if (isMatch) {
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
        if (combined.length >= 50) break;
      }
      if (combined.length >= 50) break;
    }
  }

  if (combined.length > 0) {
    LIVE_PROVINCE_CACHE.set(cacheKey, { data: combined, timestamp: Date.now() });
  }
  return combined;
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
    const directUrl = `https://masothue.com/Search/?q=${encodeURIComponent(q)}&type=${encodeURIComponent(searchType)}&force-search=0`;
    const targetUrl = proxyBase
      ? `${proxyBase.replace(/\/+$/, '')}/Search/?q=${encodeURIComponent(q)}&type=${encodeURIComponent(searchType)}&force-search=0`
      : directUrl;

    let res: Response | null = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      res = await fetch(targetUrl, {
        headers: BROWSER_FETCH_HEADERS,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch {
      res = null;
    }

    // Endpoint tìm kiếm của trang nguồn thường trả về 403, đi vòng qua ScraperAPI
    if (!res || res.status !== 200) {
      res = await fetchViaScraperApi(directUrl, `tìm kiếm "${q}"`);
    }

    if (res && res.status === 200) {
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
              status: getHarvestedStatus(id) || '',
              industryName: undefined,
              startDate: getHarvestedStartDate(id) || undefined,
              registrationDate: getHarvestedStartDate(id) || undefined
            });
            return list;
          }
        }
      }

      // Case 2: Multi-item listing search result
      const blocks = html.split("<div data-prefetch='");

      const slugById = new Map<string, string>();

      for (let i = 1; i < blocks.length; i++) {
        const b = blocks[i];
        const nameMatch = b.match(/<h3><a[^>]*>([\s\S]*?)<\/a><\/h3>/i);
        const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        const taxIdMatch = b.match(/Mã số thuế:\s*<a[^>]*>([\s\S]*?)<\/a>/i);
        const taxId = taxIdMatch ? taxIdMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        // Đường dẫn trang chi tiết nằm ngay đầu mỗi khối, dùng để lấy ngày và tình trạng
        const slugMatch = b.match(/^(\/[^']+)'/);
        if (taxId && slugMatch) slugById.set(taxId, slugMatch[1]);

        const repMatch = b.match(/Người đại diện:\s*<em><a[^>]*>([\s\S]*?)<\/a><\/em>/i);
        const rep = repMatch ? repMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        const addrMatch = b.match(/<address>([\s\S]*?)<\/address>/i);
        const address = addrMatch ? addrMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        if (taxId && name) {
          // Không lọc lại kết quả của trang nguồn bằng cách so chuỗi con.
          // Trang nguồn đã tìm theo đúng tiêu chí người dùng chọn và hiểu được
          // cả tên thương hiệu: tìm "Vietcombank" vẫn ra "NGÂN HÀNG TMCP NGOẠI
          // THƯƠNG VIỆT NAM". So chuỗi con ở đây sẽ vứt bỏ chính những kết quả
          // đó, trước đây 20 kết quả bị cắt còn 6.
          if (!list.some((item) => item.id === taxId)) {
            list.push({
              id: taxId,
              name,
              representative: rep || undefined,
              address,
              status: getHarvestedStatus(taxId) || '',
              industryName: undefined,
              startDate: getHarvestedStartDate(taxId) || undefined,
              registrationDate: getHarvestedStartDate(taxId) || undefined
            });
          }
        }
      }

      // Kết quả tìm kiếm cũng không kèm ngày và tình trạng; lấy thêm từ trang
      // chi tiết cho một số lượng giới hạn để không nã quá nhiều yêu cầu.
      if (list.length > 0) {
        await fillFactsFromDetailPages(list, slugById, 15);
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
  }

  // Không tự tra kho nội bộ ở đây: phía gọi đã luôn tra và gộp kết quả,
  // tra thêm lần nữa chỉ làm lặp lại đúng một phép quét tốn kém.
  return results;
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
      // Trang nguồn không công bố tổng số doanh nghiệp nên để 0 nghĩa là chưa rõ
      total: 0,
      page: safePage,
      pageSize,
      totalPages: UPSTREAM_PAGES_CACHE.get(cacheKey) || safePage,
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

      const slugById = new Map<string, string>();

      for (let i = 1; i < blocks.length; i++) {
        const b = blocks[i];
        const nameMatch = b.match(/<h3><a[^>]*>([\s\S]*?)<\/a><\/h3>/i);
        const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        const taxIdMatch = b.match(/Mã số thuế:\s*<a[^>]*>([\s\S]*?)<\/a>/i);
        const taxId = taxIdMatch ? taxIdMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        // Đường dẫn trang chi tiết nằm ngay đầu mỗi khối
        const slugMatch = b.match(/^(\/[^']+)'/);
        if (taxId && slugMatch) slugById.set(taxId, slugMatch[1]);

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
            status: getHarvestedStatus(taxId) || '',
            industryName: undefined,
            startDate: getHarvestedStartDate(taxId) || undefined,
            registrationDate: getHarvestedStartDate(taxId) || undefined
          });
        }
      }

      if (list.length > 0) {
        await fillMissingFactsFromDb(list);
        await fillFactsFromDetailPages(list, slugById);
        sortByNewestEstablished(list);

        const upstreamPages = parseUpstreamTotalPages(html, page);
        UPSTREAM_PAGES_CACHE.set(cacheKey, upstreamPages);
        LIVE_PROVINCE_CACHE.set(cacheKey, { data: list, timestamp: Date.now() });

        // Luu doanh nghiep vua tai ve vao MongoDB de kho du lieu tu lon dan
        saveCompaniesBatchToDb(list).catch((err) => {
          console.warn('[provinceCompanies] Luu DN toan quoc that bai:', err);
        });

        return {
          companies: list,
          total: 0,
          page: safePage,
          pageSize,
          totalPages: upstreamPages,
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

/**
 * Điền ngày thành lập còn thiếu bằng dữ liệu đã tích lũy trong MongoDB.
 * Chỉ một truy vấn cho cả danh sách, và bỏ qua khi mọi bản ghi đã có ngày.
 */
export async function fillMissingFactsFromDb(list: BusinessTaxInfo[]): Promise<void> {
  const missing = list.filter((c) => !c.startDate || !c.status);
  if (missing.length === 0) return;

  try {
    const facts = await getCompanyFactsByIds(missing.map((c) => c.id));
    if (facts.size === 0) return;

    for (const company of missing) {
      const found = facts.get(company.id) || facts.get(normalizeTaxId(company.id));
      if (!found) continue;
      if (!company.startDate && found.startDate) {
        company.startDate = found.startDate;
        company.registrationDate = found.startDate;
      }
      if (!company.status && found.status) {
        company.status = found.status;
      }
    }
  } catch (err) {
    console.warn('[provinceCompanies] Không bổ sung được ngày / trạng thái:', err);
  }
}

/**
 * Xếp doanh nghiệp mới thành lập lên đầu. Bản ghi chưa rõ ngày xuống cuối
 * thay vì bị coi là cũ nhất hay mới nhất.
 */
function sortByNewestEstablished(list: BusinessTaxInfo[]): void {
  list.sort((a, b) => {
    const dateA = a.startDate || a.registrationDate || '';
    const dateB = b.startDate || b.registrationDate || '';
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateB.localeCompare(dateA);
  });
}

/**
 * Trang nguồn không công bố tổng số doanh nghiệp, chỉ hiện dải số trang.
 * Lấy số trang lớn nhất nhìn thấy được làm tổng số trang thật, thay vì
 * bịa ra một con số tròn trĩnh như trước.
 */
function parseUpstreamTotalPages(html: string, currentPage: number): number {
  let max = currentPage;
  const re = /[?&]page=(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return Math.max(1, max);
}

/**
 * Lấy ngày hoạt động và tình trạng thật từ trang chi tiết của trang nguồn.
 * Danh sách theo tỉnh không kèm hai thông tin này, nên với doanh nghiệp chưa có
 * trong kho thì phải mở trang chi tiết mới biết. Chạy song song có giới hạn và
 * có hạn mức thời gian chung để không làm chậm trang; doanh nghiệp nào chưa kịp
 * lấy sẽ được điền ở lần xem sau nhờ dữ liệu đã lưu vào MongoDB.
 */
const DETAIL_CONCURRENCY = 6;
const DETAIL_TIME_BUDGET_MS = 3500;

async function fetchDetailFacts(slug: string): Promise<{ startDate?: string; status?: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://masothue.com${slug}`, {
      headers: BROWSER_FETCH_HEADERS,
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.status !== 200) return null;

    const html = await res.text();
    const facts: { startDate?: string; status?: string } = {};

    const dateRow = html.match(/Ngày hoạt động[\s\S]{0,200}?(\d{4}-\d{2}-\d{2})/i);
    if (dateRow) facts.startDate = dateRow[1];

    const statusRow = html.match(/Tình trạng[\s\S]{0,300}?<td[^>]*>([\s\S]*?)<\/td>/i);
    if (statusRow) {
      const text = statusRow[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (text && text.length < 120) facts.status = text;
    }

    return facts.startDate || facts.status ? facts : null;
  } catch {
    return null;
  }
}

async function fillFactsFromDetailPages(
  list: BusinessTaxInfo[],
  slugById: Map<string, string>,
  maxItems: number = 25
): Promise<void> {
  const pending = list
    .filter((c) => (!c.startDate || !c.status) && slugById.has(c.id))
    .slice(0, maxItems);
  if (pending.length === 0) return;

  const deadline = Date.now() + DETAIL_TIME_BUDGET_MS;
  let cursor = 0;

  const worker = async () => {
    while (cursor < pending.length && Date.now() < deadline) {
      const company = pending[cursor++];
      const slug = slugById.get(company.id);
      if (!slug) continue;

      const facts = await fetchDetailFacts(slug);
      if (!facts) continue;
      if (!company.startDate && facts.startDate) {
        company.startDate = facts.startDate;
        company.registrationDate = facts.startDate;
      }
      if (!company.status && facts.status) {
        company.status = facts.status;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, pending.length) }, () => worker())
  );
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
      total: 0,
      page,
      pageSize,
      totalPages: UPSTREAM_PAGES_CACHE.get(cacheKey) || page,
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

      const slugById = new Map<string, string>();

      for (let i = 1; i < blocks.length; i++) {
        const b = blocks[i];
        const nameMatch = b.match(/<h3><a[^>]*>([\s\S]*?)<\/a><\/h3>/i);
        const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        const taxIdMatch = b.match(/Mã số thuế:\s*<a[^>]*>([\s\S]*?)<\/a>/i);
        const taxId = taxIdMatch ? taxIdMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        // Đường dẫn trang chi tiết nằm ngay đầu mỗi khối
        const slugMatch = b.match(/^(\/[^']+)'/);
        if (taxId && slugMatch) slugById.set(taxId, slugMatch[1]);

        const repMatch = b.match(/Người đại diện:\s*<em><a[^>]*>([\s\S]*?)<\/a><\/em>/i);
        const rep = repMatch ? repMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        const addrMatch = b.match(/<address>([\s\S]*?)<\/address>/i);
        const address = addrMatch ? addrMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        const dateMatch = b.match(/(?:Ngày cấp|Ngày hoạt động|Ngày thành lập):\s*(?:<[^>]*>)?([\d\/\-]+)/i);
        // Trang nguồn thường không kèm ngày thành lập. Khi đó lấy ngày thật đã thu
        // thập được trong kho, còn không thì để trống - tuyệt đối không gán ngày
        // hôm nay vì sẽ hiển thị sai ngày thành lập cho toàn bộ doanh nghiệp.
        const dateStr = dateMatch ? parseDateToISO(dateMatch[1]) : getHarvestedStartDate(taxId);

        if (taxId && name) {
          list.push({
            id: taxId,
            name,
            representative: rep || undefined,
            address,
            startDate: dateStr || undefined,
            registrationDate: dateStr || undefined,
            // Trang nguồn không kèm tình trạng trong danh sách; dùng tình trạng
            // thật đã biết, chưa biết thì để trống thay vì mặc định "đang hoạt động".
            status: getHarvestedStatus(taxId) || '',
            industryName: undefined,
            province: provName
          });
        }
      }

      if (list.length > 0) {
        // Trang nguồn không kèm ngày thành lập, nên bổ sung từ kho MongoDB,
        // rồi mở trang chi tiết của những doanh nghiệp vẫn còn thiếu,
        // cuối cùng xếp doanh nghiệp mới thành lập lên đầu đúng như tiêu đề trang.
        await fillMissingFactsFromDb(list);
        await fillFactsFromDetailPages(list, slugById);
        sortByNewestEstablished(list);

        const upstreamPages = parseUpstreamTotalPages(html, page);
        UPSTREAM_PAGES_CACHE.set(cacheKey, upstreamPages);
        LIVE_PROVINCE_CACHE.set(cacheKey, { data: list, timestamp: Date.now() });

        // Tự động lưu các doanh nghiệp mới cào được vào MongoDB Atlas
        saveCompaniesBatchToDb(list).catch((err) => {
          console.warn('[provinceCompanies] Batch save error:', err);
        });

        return {
          companies: list,
          total: 0,
          page,
          pageSize,
          totalPages: upstreamPages,
          provinceName: provName,
          source: 'live-upstream-api'
        };
      }
    }
  } catch (err) {
    console.error('Error fetching live province page:', err);
  }

  // 2. Tra cứu trực tiếp từ MongoDB Atlas (được sắp xếp theo ngày thành lập mới nhất)
  try {
    const dbResult = await getCompaniesByProvinceFromDb(provSlug, page, pageSize);
    if (dbResult && dbResult.companies.length > 0) {
      return {
        companies: dbResult.companies,
        total: dbResult.total,
        page,
        pageSize,
        totalPages: dbResult.totalPages,
        provinceName: provName,
        source: 'mongodb-live-database'
      };
    }
  } catch (dbErr) {
    console.warn('[provinceCompanies] MongoDB lookup error:', dbErr);
  }

  // 3. Fallback to real harvested data only if upstream and DB are unreachable
  return getCompaniesByProvince(provSlug, page, pageSize);
}
