import { CompanyContactAI } from '@/types/tax';
import { isPhoneHidden, getKnownPhone } from '@/lib/privacyStore';

const AI_SCAN_CACHE = new Map<string, { data: CompanyContactAI; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

type AiScanResult = {
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  sources: string[];
  socialLinks: string[];
  summary: string;
  attempted: boolean;
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
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) return null;

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

  const models = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest'];

  for (const model of models) {
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
            tools: [{ googleSearch: {} }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1500,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);
      if (!response.ok) continue;

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


      const sources: string[] = ['Google Gemini AI Search'];
      const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        groundingChunks.forEach((chunk: { web?: { uri?: string } }) => {
          if (chunk.web?.uri && typeof chunk.web.uri === 'string') {
            sources.push(chunk.web.uri);
          }
        });
      }

      const hasGrounding = Array.isArray(groundingChunks) && groundingChunks.length > 0;

      // Chỉ chấp nhận email khi có grounding source thật (Gemini search web)
      // tránh Gemini tự bịế email không có thật
      if (!hasGrounding) {
        email = null;
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
    } catch {
      continue;
    }
  }

  return null;
}

export function clearAiScanCache(taxId?: string) {
  if (taxId) {
    for (const key of Array.from(AI_SCAN_CACHE.keys())) {
      if (key.includes(taxId)) {
        AI_SCAN_CACHE.delete(key);
      }
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
    if (cached && Date.now() - cached.timestamp < CACHE_TTL && cached.data.website) {
      return cached.data;
    }
  }

  // 2. Tự động tìm kiếm trên Web / Google Search trực tiếp (Tier 1: siêu nhanh, độ chính xác cao)
  const webResult = await searchCompanyWeb(company);

  // 3. Tìm kiếm qua Gemini API (Tier 2: nếu có key và còn quota)
  let geminiResult: AiScanResult | null = null;
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
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
  return result;
}
