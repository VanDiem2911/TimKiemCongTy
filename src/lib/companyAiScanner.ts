import { CompanyContactAI } from '@/types/tax';
import { isPhoneHidden, getKnownPhone } from '@/lib/privacyStore';
import { getDb, isMongoConfigured } from '@/lib/mongodb';

const AI_SCAN_CACHE = new Map<string, { data: CompanyContactAI; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
// Kết quả "không tìm thấy" chỉ nhớ ngắn trong bộ nhớ để khỏi quét lại liên tục
const NOT_FOUND_TTL = 1000 * 60 * 30;

// Kết quả quét tìm thấy website/email được lưu bền vào MongoDB (collection company_contacts),
// lần sau mở lại doanh nghiệp đó thì lấy thẳng từ DB, không quét lại.
const SAVED_COLLECTION = 'company_contacts';

async function loadSavedScan(taxId: string, hiddenNow: boolean): Promise<CompanyContactAI | null> {
  if (!isMongoConfigured()) return null;
  try {
    const db = await getDb();
    if (!db) return null;
    const doc = await db.collection<{ _id: string; data: CompanyContactAI }>(SAVED_COLLECTION).findOne({ _id: taxId });
    if (!doc?.data) return null;
    const data = doc.data;
    if (hiddenNow) {
      // Doanh nghiệp vừa yêu cầu ẩn số điện thoại sau lần quét đã lưu
      return { ...data, phone: 'Đã ẩn theo yêu cầu', phoneStatus: 'hidden' };
    }
    // Lần quét đã lưu đang ẩn số nhưng giờ đã hết ẩn: quét lại để lấy số
    if (data.phoneStatus === 'hidden') return null;
    return data;
  } catch (err) {
    console.warn('[aiScan] Không đọc được kết quả quét đã lưu:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function saveScan(taxId: string, data: CompanyContactAI): Promise<void> {
  if (!isMongoConfigured()) return;
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .collection(SAVED_COLLECTION)
      .updateOne({ _id: taxId as never }, { $set: { data, scannedAt: new Date() } }, { upsert: true });
  } catch (err) {
    console.warn('[aiScan] Không lưu được kết quả quét:', err instanceof Error ? err.message : err);
  }
}

type AiScanResult = {
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  sources: string[];
  socialLinks: string[];
  summary: string;
  attempted: boolean;
  verified?: boolean;
  error?: string;
};

const DIRECTORY_DOMAINS = new Set([
  'masothue.com',
  'thuvienphapluat.vn',
  'topmst.com',
  'doanhnghiep.biz',
  'infocom.vn',
  'topcv.vn',
  'vietnamworks.com',
  'careerviet.vn',
  'trangvangvietnam.com',
  'hosocongty.vn',
  'yellowpages.vnn.vn',
  'timkiemdoanhnghiep.com',
  'dauthau.info',
  'baodauthau.vn',
  'google.com',
  'duckduckgo.com',
  'bing.com',
  'wikipedia.org',
  'w3.org'
]);

// Danh bạ thông tin xác thực chính thức của các doanh nghiệp, tập đoàn lớn
export const KNOWN_COMPANY_CONTACTS: Record<string, { website: string; email?: string; phone?: string }> = {
  // Viettel
  '0100109106': { website: 'https://viettel.com.vn', email: 'cskh@viettel.com.vn', phone: '02462556789' },
  // Vinamilk
  '0300588569': { website: 'https://www.vinamilk.com.vn', email: 'vinamilk@vinamilk.com.vn', phone: '02854155555' },
  // PetroVietnam
  '0100681592': { website: 'https://www.pvn.vn', email: 'info@pvn.vn', phone: '02438252526' },
  // FPT
  '0101248141': { website: 'https://fpt.com', email: 'fpt@fpt.com.vn', phone: '02473007300' },
  // Vietcombank
  '0100112437': { website: 'https://www.vietcombank.com.vn', email: 'contact@vietcombank.com.vn', phone: '1900545413' },
  // VNPT
  '0100684378': { website: 'https://vnpt.com.vn', email: 'vanphong@vnpt.vn', phone: '18001091' },
  // EVN
  '0100100079': { website: 'https://www.evn.com.vn', email: 'evn@evn.com.vn', phone: '02466946666' },
  // Vingroup
  '0101245486': { website: 'https://vingroup.net', email: 'info@vingroup.net', phone: '02439749999' },
  // Masan Group
  '0303576603': { website: 'https://www.masangroup.com', email: 'communications@msn.masangroup.com', phone: '02862563862' },
  // Thế Giới Di Động (MWG)
  '0303270614': { website: 'https://mwg.vn', email: 'cskh@thegioididong.com', phone: '1900232460' },
  // Hòa Phát
  '0900189284': { website: 'https://www.hoaphat.com.vn', email: 'contact@hoaphat.com.vn', phone: '02462810055' },
  // Techcombank
  '0100230800': { website: 'https://techcombank.com', email: 'call_center@techcombank.com.vn', phone: '1800588822' },
  // MBBank
  '0100283873': { website: 'https://mbbank.com.vn', email: 'mb247@mbbank.com.vn', phone: '1900545426' },
  // BIDV
  '0100150619': { website: 'https://bidv.com.vn', email: 'bidv247@bidv.com.vn', phone: '19009247' },
  // Agribank
  '0100686174': { website: 'https://www.agribank.com.vn', email: 'cskh@agribank.com.vn', phone: '1900558818' },
};

function extractCleanBrand(company: {
  name: string;
  shortName?: string | null;
  internationalName?: string | null;
}): string {
  if (company.shortName && company.shortName.trim().length >= 2) {
    return company.shortName.trim();
  }
  const cleaned = company.name
    .replace(/^(CÔNG TY TNHH MTV|CÔNG TY TNHH MỘT THÀNH VIÊN|CÔNG TY TNHH|CÔNG TY CỔ PHẦN|CÔNG TY CP|TẬP ĐOÀN CÔNG NGHIỆP -|TẬP ĐOÀN|TỔNG CÔNG TY|NGÂN HÀNG TMCP|NGÂN HÀNG)\s+/i, '')
    .replace(/\s+(CỔ PHẦN|TNHH|JSC|CO\.,?LTD|VIỆT NAM)$/i, '')
    .trim();
  return cleaned || company.name;
}

/**
 * Tìm kiếm trực tiếp trên công cụ tìm kiếm Web (DuckDuckGo Live & Instant API)
 * Tự động trích xuất website chính thức, email công khai thật, fanpage mạng xã hội
 */
// ---- Tìm website qua Reserp (kết quả Google Search, 5.000 lượt miễn phí mỗi tháng) ----
// Khai báo RESERP_API_KEY, RESERP_API_KEY_2... (hoặc nhiều key cách nhau dấu phẩy). Key nào hết hạn mức
// hoặc sai thì tạm bỏ qua rồi dùng key khác.
function getReserpKeys(): string[] {
  const named = Object.keys(process.env)
    .map((name) => {
      const m = /^RESERP_API_KEY(?:_(\d+))?$/.exec(name);
      return m ? { order: m[1] ? Number(m[1]) : 1, value: process.env[name] } : null;
    })
    .filter((x): x is { order: number; value: string | undefined } => x !== null)
    .sort((a, b) => a.order - b.order)
    .map((x) => x.value);
  const keys: string[] = [];
  for (const source of named) {
    if (!source) continue;
    for (const part of source.split(',')) {
      const key = part.trim();
      if (key && !keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

const RESERP_KEY_DEAD = new Map<string, number>();
const RESERP_COOLDOWN_MS = 1000 * 60 * 30;

// Các trang không phải website chính thức của công ty
const NON_OFFICIAL_HOST = /(^|\.)(facebook|fb|linkedin|zalo|youtube|youtu|tiktok|instagram|twitter|x|pinterest|shopee|lazada|tiki|sendo|google|bing|wikipedia|wikimedia|maps|yelp|foody|vietnamnet|vnexpress|tuoitre|thanhnien|dantri|cafef|cafebiz|baomoi|zingnews|vietnamworks|topcv|careerbuilder|itviec|jobsgo|mywork|timviec365|joboko|123job|vieclam24h|chotot|batdongsan|alonhadat|muaban|rongbay)\.[a-z.]+$/;

// Tên miền có dạng trang tra cứu/danh bạ doanh nghiệp (chứa MST và tên công ty vì chính là nội dung của họ)
const DIRECTORY_HOST_HINT = /(masothue|mst|thongtin|dulieu|doanhnghiep|congty|hosocty|hosocongty|tracuu|danhba|trangvang|thuvien|nganhnghe|topmst|bizi|biz|yellowpages|dnse|infodn|check)/;

type SerpResult = { url?: string; text?: string };

async function reserpSearch(query: string): Promise<SerpResult[] | null> {
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=vi&gl=vn`;
  for (const key of getReserpKeys()) {
    const until = RESERP_KEY_DEAD.get(key);
    if (until && Date.now() < until) continue;
    try {
      const res = await fetch('https://api.reserp.ai/v2/serp/search', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleUrl }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 401 || res.status === 402 || res.status === 403 || res.status === 429) {
        RESERP_KEY_DEAD.set(key, Date.now() + RESERP_COOLDOWN_MS);
        console.warn(`[aiScan] Reserp key hỏng/hết hạn mức (HTTP ${res.status})`);
        continue;
      }
      if (!res.ok) continue;
      const json = (await res.json()) as { ok?: boolean; results?: SerpResult[] };
      if (json.ok && Array.isArray(json.results)) return json.results;
    } catch (err) {
      console.warn('[aiScan] Reserp lỗi:', err instanceof Error ? err.message : err);
    }
  }
  return null;
}

/**
 * Tìm website chính thức bằng kết quả Google (Reserp). Chỉ nhận website đã mở thử và kiểm chứng đúng là của
 * công ty này (có MST, số điện thoại đăng ký, tên pháp lý, hoặc khớp cả tên lẫn địa chỉ), nên không bị nhầm sang
 * công ty khác trùng tên hay sang trang danh bạ.
 */
async function searchViaReserp(company: {
  id: string;
  name: string;
  shortName?: string | null;
  internationalName?: string | null;
  address: string;
  phone?: string;
}): Promise<AiScanResult | null> {
  if (getReserpKeys().length === 0) return null;

  const brand = extractCleanBrand(company);
  // Hai truy vấn chạy song song: theo MST + tên (ra đúng trang nhắc MST) và theo thương hiệu (ra trang chủ)
  const lists = await Promise.all([`${company.id} ${company.name}`, `${brand} website chính thức`].map((q) => reserpSearch(q)));
  if (lists.every((l) => l === null)) return null; // không gọi được (hết hạn mức...) nên để bước khác lo

  // Lấy tối đa 4 website ứng viên (bỏ danh bạ, mạng xã hội, báo...) rồi kiểm chứng song song.
  // Mỗi website giữ tối đa 3 URL mà Google trả về (trang điều khoản, giới thiệu... thường mới ghi MST).
  const byHost = new Map<string, { origin: string; pageUrls: string[] }>();
  const maxLen = Math.max(...lists.map((l) => l?.length ?? 0));
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      const r = list?.[i];
      if (!r?.url) continue;
      try {
        const u = new URL(r.url);
        const host = u.hostname.toLowerCase().replace(/^www\./, '');
        if (DIRECTORY_DOMAINS.has(host) || DIRECTORY_HOST_HINT.test(host) || host.endsWith('.gov.vn') || NON_OFFICIAL_HOST.test(host)) continue;
        const entry = byHost.get(host);
        if (entry) {
          if (entry.pageUrls.length < 3 && !entry.pageUrls.includes(r.url)) entry.pageUrls.push(r.url);
        } else if (byHost.size < 4) {
          byHost.set(host, { origin: `${u.protocol}//${u.host}`, pageUrls: [r.url] });
        }
      } catch {
        continue;
      }
    }
  }

  const checks = await Promise.all([...byHost.values()].map((c) => verifyWebsite(c.origin, company, c.pageUrls)));
  const hit = checks.find((c) => c.ok); // theo đúng thứ hạng Google
  if (hit) {
    return {
      website: hit.website,
      email: hit.email ?? null,
      phone: null,
      address: null,
      sources: ['Google Search', `Đã kiểm chứng: ${hit.website}`],
      socialLinks: [],
      summary: `Đã tìm thấy và kiểm chứng website chính thức ${hit.website}.`,
      attempted: true,
      verified: true,
    };
  }
  return { website: null, email: null, phone: null, address: null, sources: ['Google Search'], socialLinks: [], summary: '', attempted: true, verified: true };
}

async function searchCompanyWeb(company: {
  id: string;
  name: string;
  shortName?: string | null;
  internationalName?: string | null;
  address: string;
}): Promise<AiScanResult | null> {
  const brand = extractCleanBrand(company);

  let officialWebsite: string | null = null;
  let officialEmail: string | null = null;
  let phoneFound: string | null = null;
  const socialLinks: string[] = [];
  const sources: string[] = ['Tìm kiếm trực tuyến Web'];
  const allSnippets: string[] = [];

  // 1. Thử qua DuckDuckGo Instant Answer API (Tier 1 nhanh và chính xác nhất cho thương hiệu)
  try {
    const ddgApiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(brand)}&format=json`;
    const apiRes = await fetch(ddgApiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(4000),
    });
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (Array.isArray(apiData.Results) && apiData.Results.length > 0) {
        for (const item of apiData.Results) {
          if (item.FirstURL) {
            try {
              const u = new URL(item.FirstURL);
              const host = u.hostname.toLowerCase().replace(/^www\./, '');
              if (!DIRECTORY_DOMAINS.has(host) && !host.endsWith('.gov.vn')) {
                officialWebsite = `${u.protocol}//${u.hostname}`;
                sources.push(officialWebsite);
                break;
              }
            } catch {}
          }
        }
      }
    }
  } catch {}

  // 2. Tìm kiếm trên DuckDuckGo Web Search (dùng endpoint trực tiếp không bị bot-block)
  const queries = [
    officialWebsite ? `${brand} email liên hệ cskh` : `${brand} website chính thức`,
    `${brand} email liên hệ cskh`,
    `${company.name} website email liên hệ`,
  ];

  for (const q of queries) {
    // Nếu đã tìm thấy cả website và email thì dừng
    if (officialWebsite && officialEmail) break;

    try {
      const res = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(q.trim())}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'vi,en;q=0.9',
        },
        signal: AbortSignal.timeout(6000),
      });

      // DuckDuckGo trả 202 (trang chống bot) cho máy chủ: các truy vấn sau cũng sẽ bị chặn, không thử tiếp
      if (res.status === 202) break;
      if (!res.ok) continue;

      const html = await res.text();
      // Bỏ qua nếu bị bot detection
      if (html.includes('anomaly-detected')) continue;

      // Trích xuất URLs
      const uddgMatches = Array.from(html.matchAll(/uddg=([^&"']+)/g))
        .map(m => {
          try {
            return decodeURIComponent(m[1]);
          } catch {
            return '';
          }
        })
        .filter(u => /^https?:\/\//i.test(u));

      // Trích xuất snippets
      const snippets = Array.from(html.matchAll(/class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g))
        .map(m =>
          m[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&amp;/g, '&')
            .trim()
        )
        .filter(s => s.length > 15);

      allSnippets.push(...snippets);
      const textToSearch = snippets.join(' ') + ' ' + html;

      // Tìm website nếu chưa có
      if (!officialWebsite) {
        for (const urlStr of uddgMatches) {
          try {
            const u = new URL(urlStr);
            const host = u.hostname.toLowerCase().replace(/^www\./, '');

            if (host === 'facebook.com' || host === 'linkedin.com') {
              if (!socialLinks.includes(urlStr) && socialLinks.length < 3) {
                socialLinks.push(urlStr);
              }
              continue;
            }

            if (DIRECTORY_DOMAINS.has(host) || host.endsWith('.gov.vn')) {
              continue;
            }

            officialWebsite = `${u.protocol}//${u.hostname}`;
            sources.push(officialWebsite);
            break;
          } catch {}
        }
      }

      // Tìm email thật trong kết quả
      const emailMatches =
        textToSearch.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];

      const cleanEmails = Array.from(
        new Set(
          emailMatches
            .map(e => e.toLowerCase())
            .filter(
              e =>
                !e.includes('duckduckgo') &&
                !e.includes('example') &&
                !e.includes('domain.com') &&
                !e.includes('w3.org') &&
                !e.endsWith('.png') &&
                !e.endsWith('.jpg')
            )
        )
      );

      // Ưu tiên email theo domain nếu đã có website
      if (!officialEmail && officialWebsite && cleanEmails.length > 0) {
        try {
          const dom = new URL(officialWebsite).hostname.replace(/^www\./, '');
          const matching = cleanEmails.find(e => e.endsWith('@' + dom) || e.endsWith('.' + dom));
          if (matching) {
            officialEmail = matching;
          }
        } catch {}
      }

      if (!officialEmail && cleanEmails.length > 0) {
        officialEmail = cleanEmails[0];
      }

      // Hotline từ snippet (chỉ nhận số điện thoại hợp lệ của Việt Nam: di động 10 số, cố định 10-11 số, hoặc tổng đài 1800/1900)
      if (!phoneFound) {
        const phoneMatches =
          textToSearch.match(/(?:(?:\+84|0)(?:2[0-9]{8,9}|[35789][0-9]{8}))|(?:1900|1800)[0-9]{4,6}/g) || [];
        for (const pm of phoneMatches) {
          const cleanPm = pm.replace(/\D/g, '');
          if (cleanPm !== company.id.replace(/\D/g, '')) {
            phoneFound = pm.replace(/\s+/g, ' ').trim();
            break;
          }
        }
      }
    } catch {
      continue;
    }
  }

  const summary =
    allSnippets[0] ||
    (officialWebsite
      ? `Hệ thống tìm kiếm đã định vị website chính thức: ${officialWebsite}`
      : 'Đã tìm kiếm thông tin doanh nghiệp trên Internet.');

  if (officialWebsite || officialEmail) {
    return {
      website: officialWebsite,
      email: officialEmail,
      phone: phoneFound,
      address: null,
      sources,
      socialLinks,
      summary,
      attempted: true,
    };
  }

  return null;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Danh sách key Gemini: GEMINI_API_KEY, GEMINI_API_KEY_2, _3... (theo thứ tự số), GOOGLE_API_KEY,
// hoặc nhiều key cách nhau dấu phẩy trong một biến.
function getGeminiKeys(): string[] {
  const named = Object.keys(process.env)
    .map((name) => {
      const m = /^GEMINI_API_KEY(?:_(\d+))?$/.exec(name);
      return m ? { order: m[1] ? Number(m[1]) : 1, value: process.env[name] } : null;
    })
    .filter((x): x is { order: number; value: string | undefined } => x !== null)
    .sort((a, b) => a.order - b.order)
    .map((x) => x.value);

  const keys: string[] = [];
  for (const source of [...named, process.env.GOOGLE_API_KEY, process.env.GOOGLE_GEMINI_API_KEY]) {
    if (!source) continue;
    for (const part of source.split(',')) {
      const key = part.trim();
      if (key && !keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

// Key hết hạn mức thì tạm ngừng dùng (tách riêng: chế độ có tìm kiếm Google thường hết hạn mức trước)
const GEMINI_SEARCH_BLOCKED = new Map<string, number>();
const GEMINI_KEY_DEAD = new Map<string, number>();
const GEMINI_COOLDOWN_MS = 1000 * 60 * 30;
let geminiCursor = 0;

const stillBlocked = (m: Map<string, number>, key: string) => {
  const until = m.get(key);
  if (!until) return false;
  if (Date.now() >= until) {
    m.delete(key);
    return false;
  }
  return true;
};

/** Key còn dùng được, xoay vòng điểm bắt đầu giữa các lần quét để dàn đều tải. */
function usableGeminiKeys(): string[] {
  const keys = getGeminiKeys().filter((k) => !stillBlocked(GEMINI_KEY_DEAD, k));
  if (keys.length <= 1) return keys;
  const start = geminiCursor++ % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

/**
 * Tra cứu thông tin liên hệ và website chính thức qua Google Gemini API
 */
async function findInfoWithGemini(company: {
  id: string;
  name: string;
  shortName?: string | null;
  internationalName?: string | null;
  address: string;
  phone?: string;
}): Promise<AiScanResult | null> {
  if (getGeminiKeys().length === 0) return null;

  const prompt = `Bạn là hệ thống AI tra cứu thông tin doanh nghiệp Việt Nam. Hãy tìm kiếm trên Google thông tin chính thức của công ty sau:
- Mã số thuế: ${company.id}
- Tên công ty: ${company.name}
- Tên viết tắt / Thương hiệu: ${company.shortName || company.internationalName || 'Không có'}
- Địa chỉ: ${company.address}

Tìm kiếm và trả về DUY NHẤT một chuỗi JSON hợp lệ:
{
  "website": "https://..." hoặc null,
  "email": "..." hoặc null,
  "phone": "..." hoặc null,
  "address": "..." hoặc null,
  "summary": "Tóm tắt ngắn gọn 1 câu về công ty và liên hệ"
}`;

  // gemini-2.0-flash-lite và gemini-1.5-flash-latest đã bị Google gỡ (404) nên không dùng nữa
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

  for (const model of models) {
   for (const apiKey of usableGeminiKeys()) {
    // Thử có tìm kiếm Google trước (cho kết quả có nguồn). Gói miễn phí thường hết hạn mức ở chế độ này
    // (429), khi đó thử lại không tìm kiếm và tự kiểm chứng website bằng cách mở thử trang đó.
    for (const useSearch of [true, false]) {
      if (useSearch && stillBlocked(GEMINI_SEARCH_BLOCKED, apiKey)) continue;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              ...(useSearch && { tools: [{ googleSearch: {} }] }),
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1500,
              },
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeout);
        if (!response.ok) {
          console.warn(`[aiScan] Gemini ${model}${useSearch ? ' + search' : ''}: HTTP ${response.status}`);
          if (response.status === 429 || response.status === 403) {
            // Hết hạn mức: ở chế độ tìm kiếm thì chỉ khóa chế độ đó, còn chế độ thường cũng hết thì bỏ cả key
            if (useSearch) GEMINI_SEARCH_BLOCKED.set(apiKey, Date.now() + GEMINI_COOLDOWN_MS);
            else {
              GEMINI_KEY_DEAD.set(apiKey, Date.now() + GEMINI_COOLDOWN_MS);
              break;
            }
          }
          continue;
        }

        const json = await response.json();
        const candidate = json.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text || '';
        const parsed = extractJsonObject(text);

        let website: string | null = null;
        let email: string | null = null;
        let phone: string | null = null;
        let address: string | null = null;
        let summary = '';

        if (parsed) {
          if (typeof parsed.website === 'string' && /^https?:\/\//i.test(parsed.website.trim())) {
            website = parsed.website.trim();
          }
          if (typeof parsed.email === 'string' && parsed.email.includes('@')) {
            email = parsed.email.trim().toLowerCase();
          }
          if (typeof parsed.phone === 'string' && /\d{4,}/.test(parsed.phone)) {
            phone = parsed.phone.trim();
          }
          if (typeof parsed.address === 'string' && parsed.address.trim().length > 5) {
            address = parsed.address.trim();
          }
          if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
            summary = parsed.summary.trim();
          }
        }

        // Regex fallback nếu Gemini trả lời dạng văn bản thay vì JSON (chỉ dùng cho website)
        if (!website) {
          const urlMatch = text.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s"']*)?/);
          if (urlMatch && !urlMatch[0].includes('google.com') && !urlMatch[0].includes('schema.org')) {
            website = urlMatch[0];
          }
        }
        // KHÔNG dùng regex fallback cho email - Gemini có thể bịa email không có thật

        const sources: string[] = [useSearch ? 'Google Gemini AI Search' : 'Google Gemini AI'];
        const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
        if (Array.isArray(groundingChunks)) {
          groundingChunks.forEach((chunk: { web?: { uri?: string } }) => {
            if (chunk.web?.uri && typeof chunk.web.uri === 'string') {
              sources.push(chunk.web.uri);
            }
          });
        }

        const hasGrounding = Array.isArray(groundingChunks) && groundingChunks.length > 0;

        // Email chỉ tin khi có nguồn tìm kiếm thật, tránh Gemini tự bịa
        if (!hasGrounding) {
          email = null;
        }

        // Không có nguồn tìm kiếm: Gemini có thể bịa website nên phải mở thử trang đó, chỉ nhận khi
        // đúng là trang của công ty này. Email lấy từ chính trang đã kiểm chứng, không lấy từ Gemini.
        if (!hasGrounding && website) {
          const check = await verifyWebsite(website, company);
          if (check.ok) {
            website = check.website;
            if (check.email) email = check.email;
            sources.push(`Đã kiểm chứng: ${check.website}`);
          } else {
            website = null;
          }
        }

        if (website || email) {
          return {
            website,
            email,
            phone,
            address,
            sources,
            socialLinks: [],
            summary: summary || (website ? `Đã xác minh website chính thức: ${website}` : ''),
            attempted: true,
          };
        }
        // Gemini đã trả lời xong mà không có gì dùng được: model hay chế độ khác cũng ra tương tự, dừng để khỏi chờ lâu
        return null;
      } catch (err) {
        console.warn(`[aiScan] Gemini ${model}:`, err instanceof Error ? err.message : err);
        continue;
      }
    }
   }
  }

  return null;
}

/**
 * Mở thử website do AI gợi ý và chỉ nhận khi đúng là trang của công ty (có MST, hoặc tên miền và nội dung
 * khớp tên thương hiệu). Trả về thêm email công khai tìm thấy ngay trên trang đó nếu có.
 */
async function verifyWebsite(
  url: string,
  company: { id: string; name: string; shortName?: string | null; internationalName?: string | null; address: string; phone?: string },
  extraUrls: string[] = []
): Promise<{ ok: boolean; website: string; email?: string }> {
  const fail = { ok: false, website: url };
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return fail;
  }
  const host = u.hostname.toLowerCase();
  // Chỉ nhận tên miền thật (loại IP, localhost, địa chỉ nội bộ) và loại các trang danh bạ
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(host) || DIRECTORY_DOMAINS.has(host.replace(/^www\./, '')) || DIRECTORY_HOST_HINT.test(host)) return fail;

  const origin = `${u.protocol}//${u.host}`;
  const norm = (x: string) =>
    x.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

  // Mở song song trang chủ, trang liên hệ và (nếu có) trang cụ thể mà Google trả về cho truy vấn tên + MST
  const pages = await Promise.all(
    [origin, ...['/lien-he', '/contact', '/gioi-thieu', '/about', '/about-us', '/ve-chung-toi', '/contact-us'].map((x) => origin + x), ...extraUrls].map(async (target, i) => {
      try {
        const res = await fetch(target, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
          signal: AbortSignal.timeout(4500),
          redirect: 'follow',
        });
        if (!res.ok) return { i, text: '' };
        return { i, text: (await res.text()).slice(0, 300000) };
      } catch {
        return { i, text: '' };
      }
    })
  );
  // Trang chủ không mở được thì coi như website không dùng được
  if (!pages[0].text && !pages.slice(8).some((pg) => pg.text)) return fail;
  const html = pages.map((pg) => pg.text).join('\n');
  if (!html) return fail;

  const text = norm(html);
  // Trang danh bạ liệt kê nhiều công ty nên nhắc "mã số thuế" rất nhiều lần; website của một công ty thì không
  if ((text.match(/ma so thue/g) || []).length >= 4) return fail;
  const hostFlat = host.replace(/[^a-z0-9]/g, '');
  const brand = norm(extractCleanBrand(company));
  const tokens = brand.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  const digits = company.id.replace(/\D/g, '').slice(0, 10);

  const hasMst = digits.length === 10 && text.includes(digits);
  const compactBrand = brand.replace(/[^a-z0-9]/g, '');
  const hostBrand = compactBrand.length >= 5 && hostFlat.includes(compactBrand);
  const ratio = tokens.length ? tokens.filter((t) => text.includes(t)).length / tokens.length : 0;

  // Nhiều công ty trùng tên ("Hùng Anh"...), nên ngoài tên còn phải khớp địa chỉ cụ thể (phường/quận/huyện...),
  // không tính riêng tỉnh/thành ở cuối địa chỉ vì trang của công ty khác cùng tỉnh cũng có.
  const segs = company.address
    .split(',')
    .map((x) => norm(x).replace(/\b(thanh pho|tinh|huyen|quan|thi xa|thi tran|phuong|xa|tp|viet nam)\b/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((x) => x.length >= 4);
  const specific = segs.length > 1 ? segs.slice(0, -1) : segs;
  const addressMatch = specific.some((x) => text.includes(x));

  // Số điện thoại đăng ký của công ty xuất hiện trên trang cũng là bằng chứng mạnh (bỏ dấu cách, chấm, gạch khi so)
  const phoneDigits = (company.phone || '').replace(/[^0-9]/g, '');
  const compactHtml = html.replace(/(\d)[ .()-]+(?=\d)/g, '$1');
  const phoneMatch = phoneDigits.length >= 9 && compactHtml.includes(phoneDigits);

  // Tên pháp lý đầy đủ ("CÔNG TY CỔ PHẦN TẬP ĐOÀN HOA SEN") xuất hiện nguyên văn trên trang: công ty khác
  // chỉ trùng thương hiệu thì không có đúng chuỗi này
  const loose = (x: string) => norm(x).replace(/[^a-z0-9]+/g, ' ').trim();
  const fullName = loose(company.name);
  const nameMatch = fullName.length >= 12 && (' ' + loose(html) + ' ').includes(' ' + fullName + ' ');

  // Website chính thức của công ty hầu như luôn có tên thương hiệu trong tên miền; trang xếp hạng, báo chí, danh bạ
  // nhắc tới công ty (có cả MST và tên) thì tên miền không có
  const hostHasBrand = tokens.some((t) => hostFlat.includes(t)) || hostBrand;

  // Chỉ nhận khi trang có chính MST, số điện thoại đăng ký hoặc tên pháp lý đầy đủ của công ty,
  // hoặc khớp cả tên thương hiệu lẫn địa chỉ cụ thể
  if (process.env.AISCAN_DEBUG) {
    console.info('[aiScan] kiểm chứng ' + host + ' ' + JSON.stringify({ hostHasBrand, hasMst, phoneMatch, nameMatch, addressMatch, ratio, tokens }));
  }
  const ok = hostHasBrand && (hasMst || phoneMatch || nameMatch || (addressMatch && (ratio >= 0.8 || (hostBrand && ratio >= 0.5))));
  if (!ok) return fail;

  // Email công khai trên chính trang đó, ưu tiên email cùng tên miền với website
  const rootDomain = host.replace(/^www\./, '');
  const emails = Array.from(new Set((html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).map((e) => e.toLowerCase())));
  const usable = emails.filter((e) => !/\.(png|jpe?g|gif|svg|webp)$/.test(e) && !/(sentry|wixpress|example\.|your-?email|domain\.)/.test(e));
  const email = usable.find((e) => e.endsWith('@' + rootDomain) || e.endsWith('.' + rootDomain)) || undefined;

  return { ok: true, website: origin, ...(email && { email }) };
}

export function clearAiScanCache(taxId?: string) {
  if (taxId) {
    for (const key of Array.from(AI_SCAN_CACHE.keys())) {
      if (key === taxId || key.includes(taxId)) AI_SCAN_CACHE.delete(key);
    }
    // Quản trị đổi trạng thái ẩn/hiện SĐT: bỏ cả bản đã lưu trong DB để lần sau quét lại cho đúng
    if (isMongoConfigured()) {
      getDb()
        .then((db) => db?.collection(SAVED_COLLECTION).deleteOne({ _id: taxId as never }))
        .catch(() => {});
    }
  } else {
    AI_SCAN_CACHE.clear();
  }
}

function formatCurrentTimeVietnam(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 3600000 * 7);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = vnTime.getFullYear();
  const mm = pad(vnTime.getMonth() + 1);
  const dd = pad(vnTime.getDate());
  const hh = pad(vnTime.getHours());
  const min = pad(vnTime.getMinutes());
  const ss = pad(vnTime.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

/**
 * AI Company Contact & Website Scanner
 * Tự động tìm kiếm qua Google / Web Search và Gemini API, kiểm tra sự hiện diện web, hotline & email
 */
export async function scanCompanyContactAI(
  company: {
    id: string;
    name: string;
    shortName?: string | null;
    internationalName?: string | null;
    address: string;
    phone?: string;
    representative?: string;
  },
  forceRefresh = false
): Promise<CompanyContactAI> {
  const taxId = company.id.trim();

  // 1. Trả về kết quả từ Cache nếu có và hợp lệ
  if (!forceRefresh) {
    const cached = AI_SCAN_CACHE.get(taxId);
    if (cached) {
      const found = Boolean(cached.data.website || cached.data.email);
      if (Date.now() - cached.timestamp < (found ? CACHE_TTL : NOT_FOUND_TTL)) return cached.data;
    }

    // Đã từng quét được thì lấy thẳng từ DB, không quét lại
    const saved = await loadSavedScan(taxId, isPhoneHidden(company.id));
    if (saved) {
      AI_SCAN_CACHE.set(taxId, { data: saved, timestamp: Date.now() });
      return saved;
    }
  }

  // 2. Tự động tìm kiếm trên Web / Google Search trực tiếp (Tier 1: siêu nhanh, độ chính xác cao)
  // Ưu tiên tìm bằng Google (Reserp); không có key hoặc không gọi được thì dùng cách tìm web cũ
  let webResult = (await searchViaReserp(company)) ?? (await searchCompanyWeb(company));

  // Bước tìm web hay trả nhầm trang của công ty khác trùng tên ("Hùng Anh"...): mở thử trang đó để kiểm chứng,
  // không đúng thì bỏ cả website lẫn email đi kèm. Doanh nghiệp có hồ sơ xác thực sẵn thì không cần.
  if (webResult?.website && !webResult.verified && !KNOWN_COMPANY_CONTACTS[taxId]) {
    const check = await verifyWebsite(webResult.website, company);
    webResult = check.ok
      ? { ...webResult, website: check.website, email: webResult.email || check.email || null }
      : { ...webResult, website: null, email: null };
  }

  // 3. Tìm kiếm qua Gemini API (Tier 2: nếu có key và còn quota)
  let geminiResult: AiScanResult | null = null;
  if (!webResult?.website && !webResult?.verified && getGeminiKeys().length > 0) {
    geminiResult = await findInfoWithGemini(company);
  }

  // Smart domain inference: nếu cả 2 nguồn đều không tìm thấy website, thử xây dựng từ brand slug
  const brandSlugForDomain = (
    company.shortName?.replace(/co\.,?ltd|company limited|tnhh|cổ phần|cp|joint stock|jsc/gi, '')
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '').trim() ||
    company.internationalName?.replace(/co\.,?ltd|company limited|jsc/gi, '')
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '').trim() ||
    ''
  );

  // Kiểm tra danh bạ xác thực chính thức của doanh nghiệp
  const knownContact = KNOWN_COMPANY_CONTACTS[taxId];

  // Hợp nhất dữ liệu: Ưu tiên dữ liệu xác thực chính thức -> Web Search -> Gemini
  const verifiedWebsite = knownContact?.website || geminiResult?.website || webResult?.website || null;
  const verifiedEmail = knownContact?.email || geminiResult?.email || webResult?.email || null;
  const socialLinks = Array.from(
    new Set([...(webResult?.socialLinks || []), ...(geminiResult?.socialLinks || [])])
  );
  const sourcesChecked = Array.from(
    new Set([
      'Google / Web Search',
      ...(knownContact ? ['Hồ sơ xác thực doanh nghiệp', knownContact.website] : []),
      ...(webResult?.sources || []),
      ...(geminiResult?.sources || []),
    ])
  );

  // Số điện thoại & trạng thái
  const isHidden = isPhoneHidden(company.id);
  const fallbackKnown = getKnownPhone(company.id);
  
  // Ưu tiên: Số điện thoại từ Gemini -> Hotline phát hiện -> Số trong hồ sơ công ty
  let rawPhoneCandidate = geminiResult?.phone || '';
  if (!rawPhoneCandidate) {
    if (webResult?.phone && (webResult.phone.startsWith('1900') || webResult.phone.startsWith('1800') || webResult.phone.startsWith('+84'))) {
      rawPhoneCandidate = webResult.phone;
    } else {
      rawPhoneCandidate = company.phone || fallbackKnown || webResult?.phone || '';
    }
  }

  const phone = isHidden
    ? 'Đã ẩn theo yêu cầu'
    : rawPhoneCandidate && !rawPhoneCandidate.includes('ẩn')
    ? rawPhoneCandidate
    : 'Chưa cập nhật';

  let phoneStatus: 'available' | 'hidden' | 'not_found' = 'not_found';
  if (isHidden) {
    phoneStatus = 'hidden';
  } else if (/\d{4,}/.test(phone)) {
    phoneStatus = 'available';
  }

  // Email doanh nghiệp - CHỈ dùng email thật, KHÔNG tạo giả từ domain
  const email: string | null = (verifiedEmail && verifiedEmail.includes('@')) ? verifiedEmail : null;
  const emailStatus: 'available' | 'not_found' = email ? 'available' : 'not_found';

  // Địa chỉ
  const address = geminiResult?.address || company.address;

  // Tóm tắt kết quả
  const aiScanSummary =
    geminiResult?.summary ||
    webResult?.summary ||
    (verifiedWebsite
      ? `Hệ thống tìm kiếm đã xác minh website chính thức ${verifiedWebsite} của doanh nghiệp.`
      : 'Hệ thống đã rà soát thông tin trực tuyến của doanh nghiệp.');

  const wasScanned = Boolean(webResult?.attempted || geminiResult?.attempted);

  // Mạng xã hội định dạng chuẩn
  const formattedSocialLinks: NonNullable<CompanyContactAI['socialLinks']> = [];
  for (const url of socialLinks) {
    if (url.includes('facebook.com')) {
      formattedSocialLinks.push({ platform: 'facebook', url, label: 'Fanpage Facebook' });
    } else if (url.includes('linkedin.com')) {
      formattedSocialLinks.push({ platform: 'linkedin', url, label: 'Trang LinkedIn' });
    } else if (url.includes('zalo.me')) {
      formattedSocialLinks.push({ platform: 'zalo', url, label: 'Zalo Official' });
    } else if (url.includes('youtube.com')) {
      formattedSocialLinks.push({ platform: 'youtube', url, label: 'Kênh YouTube' });
    }
  }

  const result: CompanyContactAI = {
    phone,
    phoneStatus,
    email,
    emailStatus,
    address,
    website: verifiedWebsite,
    hasWebsite: Boolean(verifiedWebsite),
    websiteStatus: verifiedWebsite ? 'found' : wasScanned ? 'not_found' : 'pending',
    socialLinks: formattedSocialLinks,
    aiScannedAt: formatCurrentTimeVietnam(),
    aiScanSummary,
    verifiedByAi: wasScanned,
    sourcesChecked,
  };

  AI_SCAN_CACHE.set(taxId, { data: result, timestamp: Date.now() });
  // Chỉ lưu bền khi quét ra được website hoặc email; kết quả "không thấy" thì lần sau thử lại
  if (result.website || result.email) await saveScan(taxId, result);
  return result;
}
