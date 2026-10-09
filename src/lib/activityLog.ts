import { getDb, isMongoConfigured } from '@/lib/mongodb';
import { PROVINCES } from '@/lib/constants';

/**
 * Nhật ký thao tác của người truy cập website (lưu ở MongoDB, collection `activity_logs`).
 *
 * Vị trí được suy ra từ địa chỉ IP nên chỉ chính xác ở mức tỉnh/thành phố (và nhà mạng),
 * không thể ra tới số nhà hay tên đường.
 */

export type ActivityAction = 'view' | 'search' | 'refresh' | 'create';

export interface ActivityLocation {
  label: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
}

export interface ActivityLog {
  createdAt: Date;
  ip: string;
  location: ActivityLocation;
  userAgent: string;
  device: string;
  channel: 'web' | 'api';
  feature: string;
  action: ActivityAction;
  summary: string;
  target?: string;
  path?: string;
}

export interface ActivityInput {
  channel?: 'web' | 'api';
  feature: string;
  action: ActivityAction;
  summary: string;
  target?: string;
  path?: string;
}

const COLLECTION = 'activity_logs';
const RETENTION_DAYS = 90;

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http|vercel/i;

export function isBotUserAgent(ua: string): boolean {
  return !ua || BOT_PATTERN.test(ua);
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || headers.get('x-real-ip') || headers.get('x-vercel-forwarded-for') || '';
}

function isPrivateIp(ip: string): boolean {
  return (
    !ip ||
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('fc') ||
    ip.startsWith('fd') ||
    ip.startsWith('fe80')
  );
}

export function describeDevice(ua: string): string {
  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /Android/i.test(ua)
      ? 'Android'
      : /iPhone|iPad|iOS/i.test(ua)
        ? 'iOS'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Không rõ';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/i.test(ua)
      ? 'Opera'
      : /Chrome\//i.test(ua)
        ? 'Chrome'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : 'Trình duyệt khác';
  const kind = /Mobile|Android|iPhone/i.test(ua) ? 'Di động' : 'Máy tính';
  return `${browser} · ${os} · ${kind}`;
}

// ---- Tra cứu vị trí từ IP ----
const GEO_CACHE = new Map<string, { at: number; value: ActivityLocation }>();
const GEO_TTL_MS = 1000 * 60 * 60 * 24;

const VN_CITY_NAMES: Record<string, string> = {
  'ho chi minh city': 'TP. Hồ Chí Minh',
  hanoi: 'Hà Nội',
  'ha noi': 'Hà Nội',
  'da nang': 'Đà Nẵng',
  'hai phong': 'Hải Phòng',
  'can tho': 'Cần Thơ',
};

function fromVercelHeaders(headers: Headers): ActivityLocation | null {
  const rawCity = headers.get('x-vercel-ip-city');
  const country = headers.get('x-vercel-ip-country') || undefined;
  if (!rawCity && !country) return null;
  let city = rawCity || '';
  try {
    city = decodeURIComponent(city);
  } catch {
    // giữ nguyên chuỗi gốc
  }
  const pretty = VN_CITY_NAMES[city.toLowerCase()] || city;
  const countryName = country === 'VN' ? 'Việt Nam' : country;
  return { label: [pretty, countryName].filter(Boolean).join(', ') || 'Không rõ', city: pretty, country: countryName };
}

const compact = (x: string) =>
  x
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(city|province)$/, '');

// ip-api trả tên tỉnh bằng tiếng Anh/không dấu: đổi sang tên tiếng Việt theo danh sách 63 tỉnh thành
function viProvinceName(name?: string): string | undefined {
  if (!name) return name;
  const key = compact(name);
  const found = PROVINCES.find((p) => compact(p.name) === key);
  return found ? found.name : name;
}

async function fromIpApi(ip: string): Promise<ActivityLocation | null> {
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,district,isp`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      status?: string;
      country?: string;
      regionName?: string;
      city?: string;
      district?: string;
      isp?: string;
    };
    if (j.status !== 'success') return null;
    const country = j.country === 'Vietnam' ? 'Việt Nam' : j.country;
    const city = viProvinceName(j.city);
    const region = viProvinceName(j.regionName);
    const parts = [j.district, city, region && region !== city ? region : '', country].filter(Boolean) as string[];
    return { label: parts.join(', '), city, region, country, isp: j.isp };
  } catch {
    return null;
  }
}

export async function resolveLocation(ip: string, headers: Headers): Promise<ActivityLocation> {
  if (isPrivateIp(ip)) return { label: 'Mạng nội bộ (localhost)' };

  const cached = GEO_CACHE.get(ip);
  if (cached && Date.now() - cached.at < GEO_TTL_MS) return cached.value;

  const value = (await fromIpApi(ip)) || fromVercelHeaders(headers) || { label: 'Không xác định được vị trí' };
  GEO_CACHE.set(ip, { at: Date.now(), value });
  if (GEO_CACHE.size > 5000) GEO_CACHE.clear();
  return value;
}

// ---- Ghi log ----
let indexesReady = false;

export async function logActivity(entry: ActivityInput, headers: Headers): Promise<void> {
  try {
    if (!isMongoConfigured()) return;

    const userAgent = headers.get('user-agent') || '';
    if (isBotUserAgent(userAgent)) return;

    const ip = getClientIp(headers) || 'không rõ';
    const location = await resolveLocation(ip, headers);

    const db = await getDb();
    if (!db) return;
    const coll = db.collection<ActivityLog>(COLLECTION);

    if (!indexesReady) {
      indexesReady = true;
      coll.createIndex({ createdAt: -1 }, { expireAfterSeconds: RETENTION_DAYS * 24 * 3600 }).catch(() => {});
      coll.createIndex({ ip: 1, createdAt: -1 }).catch(() => {});
    }

    await coll.insertOne({
      createdAt: new Date(),
      ip,
      location,
      userAgent: userAgent.slice(0, 300),
      device: describeDevice(userAgent),
      channel: entry.channel ?? 'web',
      feature: entry.feature,
      action: entry.action,
      summary: entry.summary.slice(0, 300),
      ...(entry.target && { target: entry.target.slice(0, 200) }),
      ...(entry.path && { path: entry.path.slice(0, 300) }),
    });
  } catch (err) {
    console.warn('[activityLog] Không ghi được nhật ký:', err instanceof Error ? err.message : err);
  }
}

/** Suy ra chức năng và tóm tắt từ đường dẫn trang. */
export function describePath(path: string): { feature: string; summary: string; target?: string } {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  if (clean === '/') return { feature: 'Trang chủ', summary: 'Mở trang chủ' };
  if (clean.startsWith('/tra-cuu-ma-so-thue-theo-tinh')) {
    const slug = clean.split('/')[2];
    return slug
      ? { feature: 'Tỉnh thành', summary: `Xem doanh nghiệp theo tỉnh: ${slug.replace(/-\d+$/, '').replace(/-/g, ' ')}`, target: slug }
      : { feature: 'Tỉnh thành', summary: 'Xem danh sách tỉnh thành' };
  }
  if (clean.startsWith('/tra-cuu-ma-so-thue-theo-nganh-nghe')) {
    const slug = clean.split('/')[2];
    return slug
      ? { feature: 'Ngành nghề', summary: `Xem doanh nghiệp theo ngành: ${slug.replace(/-/g, ' ')}`, target: slug }
      : { feature: 'Ngành nghề', summary: 'Xem danh sách ngành nghề' };
  }
  if (clean.startsWith('/lien-he')) return { feature: 'Liên hệ', summary: 'Mở trang liên hệ' };
  const company = /^\/(\d{10}(?:-\d{3})?)(?:-(.+))?$/.exec(clean);
  if (company) {
    const name = company[2] ? company[2].replace(/-/g, ' ').toUpperCase() : '';
    return { feature: 'Hồ sơ công ty', summary: `Xem hồ sơ ${company[1]}${name ? ' · ' + name : ''}`, target: company[1] };
  }
  return { feature: 'Trang khác', summary: `Mở trang ${clean}` };
}
