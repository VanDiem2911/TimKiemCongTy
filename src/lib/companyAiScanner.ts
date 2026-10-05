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

/**
 * Tìm kiếm trực tiếp trên công cụ tìm kiếm Web (Google / DuckDuckGo live search)
 * Tự động trích xuất website chính thức, email công khai, fanpage mạng xã hội và mô tả
 */
async function searchCompanyWeb(company: {
  id: string;
  name: string;
  shortName?: string | null;
  internationalName?: string | null;
  address: string;
}): Promise<AiScanResult | null> {
  const brand =
    company.shortName?.replace(/co\.,?ltd|company limited|tnhh|cổ phần|cp/gi, '').trim() ||
    company.internationalName?.replace(/co\.,?ltd|company limited/gi, '').trim() ||
    '';

  const queries = [
    `${company.name} ${brand} website email`,
    `${company.name} ${company.id} website`,
  ];

  for (const q of queries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q.trim())}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) continue;

      const html = await res.text();

      // 1. Trích xuất danh sách link chuyển hướng
      const uddgMatches = Array.from(html.matchAll(/uddg=([^&"]+)/g))
        .map(m => {
          try {
            return decodeURIComponent(m[1]);
          } catch {
            return '';
          }
        })
        .filter(u => /^https?:\/\//i.test(u));

      // 2. Trích xuất các đoạn trích tóm tắt (snippets)
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

      const fullSnippetText = snippets.join(' ');

      // 3. Tìm website chính thức (bỏ qua các trang tra cứu danh bạ)
      let officialWebsite: string | null = null;
      const socialLinks: string[] = [];
      const sources: string[] = ['Tìm kiếm trực tuyến Web'];

      for (const urlStr of uddgMatches) {
        try {
          const u = new URL(urlStr);
          const host = u.hostname.toLowerCase().replace(/^www\./, '');

          // Fanpage mạng xã hội
          if (host === 'facebook.com' || host === 'linkedin.com') {
            if (!socialLinks.includes(urlStr) && socialLinks.length < 3) {
              socialLinks.push(urlStr);
            }
            continue;
          }

          // Bỏ qua trang danh bạ, tra cứu mã số thuế, cơ quan nhà nước
          if (DIRECTORY_DOMAINS.has(host) || host.endsWith('.gov.vn')) {
            continue;
          }

          // Website chính thức
          if (!officialWebsite) {
            officialWebsite = `${u.protocol}//${u.hostname}`;
            sources.push(officialWebsite);
          }
        } catch {}
      }

      // 4. Tìm kiếm email công khai
      let officialEmail: string | null = null;
      const emailMatches =
        fullSnippetText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      for (const em of emailMatches) {
        const lower = em.toLowerCase();
        if (
          !lower.includes('example') &&
          !lower.includes('domain.com') &&
          !lower.includes('w3.org')
        ) {
          officialEmail = lower;
          break;
        }
      }

      // Nếu tìm thấy website nhưng chưa thấy email, tạo email liên hệ tên miền
      if (!officialEmail && officialWebsite) {
        try {
          const host = new URL(officialWebsite).hostname.replace(/^www\./, '');
          officialEmail = `contact@${host}`;
        } catch {}
      }

      // 5. Tìm số hotline trong nội dung nếu có (loại trừ mã số thuế)
      let phoneFound: string | null = null;
      const phoneMatches =
        fullSnippetText.match(/(?:\+84|0)(?:[0-9] ?){8,10}[0-9]/g) || [];
      for (const pm of phoneMatches) {
        const cleanPm = pm.replace(/\D/g, '');
        if (cleanPm !== company.id.replace(/\D/g, '') && cleanPm.length >= 9) {
          phoneFound = pm.replace(/\s+/g, ' ').trim();
          break;
        }
      }

      // 6. Tóm tắt kết quả
      const summaryCandidate =
        snippets.find(
          s =>
            s.toLowerCase().includes('công ty') ||
            s.toLowerCase().includes('chuyên') ||
            s.toLowerCase().includes('phần mềm') ||
            s.toLowerCase().includes('dịch vụ')
        ) || snippets[0];

      const summary =
        summaryCandidate ||
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
    } catch {
      continue;
    }
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

  const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

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

      // Regex fallback nếu Gemini trả lời dạng văn bản thay vì JSON
      if (!website) {
        const urlMatch = text.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s"']*)?/);
        if (urlMatch && !urlMatch[0].includes('google.com') && !urlMatch[0].includes('schema.org')) {
          website = urlMatch[0];
        }
      }
      if (!email) {
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch && !emailMatch[0].includes('example')) {
          email = emailMatch[0].toLowerCase();
        }
      }

      const sources: string[] = ['Google Gemini AI Search'];
      const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        groundingChunks.forEach((chunk: { web?: { uri?: string } }) => {
          if (chunk.web?.uri && typeof chunk.web.uri === 'string') {
            sources.push(chunk.web.uri);
          }
        });
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

  // Hợp nhất dữ liệu: Ưu tiên website và email tìm thấy từ Web/Gemini
  const verifiedWebsite = geminiResult?.website || webResult?.website || null;
  const verifiedEmail = geminiResult?.email || webResult?.email || null;
  const socialLinks = Array.from(
    new Set([...(webResult?.socialLinks || []), ...(geminiResult?.socialLinks || [])])
  );
  const sourcesChecked = Array.from(
    new Set([
      'Google / Web Search',
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

  // Email doanh nghiệp
  let email: string | null = verifiedEmail;
  let emailStatus: 'available' | 'not_found' = 'not_found';
  if (email && email.includes('@')) {
    emailStatus = 'available';
  } else if (verifiedWebsite) {
    try {
      const hostname = new URL(verifiedWebsite).hostname.replace(/^www\./, '');
      email = `contact@${hostname}`;
      emailStatus = 'available';
    } catch {}
  }

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
