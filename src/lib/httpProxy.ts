import { ProxyAgent, fetch as undiciFetch } from 'undici';

/**
 * Gọi trang nguồn qua một proxy HTTP riêng (IP dân cư Việt Nam).
 *
 * Trang nguồn chặn IP của máy chủ đám mây nhưng cho IP dân cư Việt Nam đi qua,
 * nên đây là đường vòng rẻ nhất, không tốn credit như ScraperAPI.
 *
 * Cấu hình bằng biến môi trường MASOTHUE_HTTP_PROXY:
 *   http://USER:PASS@host:port   proxy có tài khoản
 *   http://host:port             proxy xác thực theo IP, hoặc đã bỏ USER:PASS
 * Để trống thì bỏ qua, hệ thống dùng thẳng ScraperAPI như trước.
 */

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi,en;q=0.9',
  'Referer': 'https://masothue.com/',
};

// Giữ lại một ProxyAgent để các lượt gọi dùng chung kết nối, chỉ dựng lại khi cấu hình đổi
let cachedAgent: { url: string; agent: ProxyAgent } | null = null;

function getAgent(proxyUrl: string): ProxyAgent {
  if (cachedAgent?.url !== proxyUrl) {
    cachedAgent = { url: proxyUrl, agent: new ProxyAgent(proxyUrl) };
  }
  return cachedAgent.agent;
}

export function isHttpProxyConfigured(): boolean {
  return Boolean(process.env.MASOTHUE_HTTP_PROXY?.trim());
}

/**
 * Trả về phản hồi 200 của trang nguồn, hoặc null nếu chưa cấu hình proxy, proxy
 * lỗi hay trang nguồn không trả 200. Lý do luôn được ghi ra log (không ghi địa
 * chỉ proxy vì có thể chứa tài khoản) để biết proxy chết hay bị trang nguồn chặn.
 */
export async function fetchViaHttpProxy(
  targetUrl: string,
  label: string,
  timeoutMs = 15000
): Promise<Response | null> {
  const proxyUrl = process.env.MASOTHUE_HTTP_PROXY?.trim();
  if (!proxyUrl) return null;

  try {
    const res = await undiciFetch(targetUrl, {
      dispatcher: getAgent(proxyUrl),
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 200) return res as unknown as Response;

    console.warn(`[Proxy] ${label}: trang nguồn trả ${res.status} khi đi qua proxy`);
    await res.body?.cancel().catch(() => {});
    return null;
  } catch (err) {
    let reason = err instanceof Error ? (err.cause instanceof Error ? err.cause.message : err.message) : String(err);
    // undici chỉ báo "Request was cancelled" khi proxy trả mã khác 200 lúc mở đường hầm
    if (reason === 'Request was cancelled.') {
      reason = 'proxy từ chối, thường do sai USER:PASS hoặc IP máy chủ chưa được cấp phép';
    }
    console.warn(`[Proxy] ${label}: không đi qua được proxy (${reason})`);
    return null;
  }
}
