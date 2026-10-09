/**
 * Enterprise Tax Data Scraper (Công cụ Cào Dữ Liệu Doanh Nghiệp Thật 100%)
 * 
 * Tính năng chính:
 * 1. Cào dữ liệu THẬT 100% từ masothue.com khắp 63 tỉnh thành Việt Nam.
 * 2. Hỗ trợ mục tiêu tùy chỉnh: 5.000 -> 10.000 doanh nghiệp (--target 5000 / --target 10000).
 * 3. Tự động lấy: MST thật, Tên thật, Đại diện thật, Địa chỉ thật, Tỉnh/thành thật.
 * 4. Chế độ --enrich: Lấy thêm Ngày thành lập thật, Số điện thoại thật, Quản lý thuế, Ngành nghề thật.
 * 5. Tự động lưu lũy tiến vào MongoDB (không lo mất dữ liệu khi dừng).
 * 6. Cơ chế chống trùng lặp MST và chống rate-limit thông minh.
 * 
 * Cách dùng:
 *   node scripts/crawler.mjs --target 5000
 *   node scripts/crawler.mjs --target 10000
 *   node scripts/crawler.mjs --target 5000 --enrich
 */

import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

// Nạp biến môi trường từ .env.local để script chạy độc lập cũng kết nối được
function loadEnvLocal() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      if (!process.env[key]) process.env[key] = trimmed.slice(idx + 1).trim();
    }
  } catch {}
}
loadEnvLocal();

// Đẩy doanh nghiệp vừa cào thẳng vào MongoDB. Trước đây crawler chỉ ghi ra file
// JSON, nên cào bao nhiêu thì kho MongoDB mà website dùng để tra cứu vẫn đứng yên.
let mongoClient = null;
async function getMongoCollection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  try {
    if (!mongoClient) {
      mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
      await mongoClient.connect();
    }
    return mongoClient.db(process.env.MONGODB_DB_NAME || 'timkiemcongty').collection('companies');
  } catch (err) {
    console.warn('⚠️ Không kết nối được MongoDB:', err?.message || err);
    return null;
  }
}

async function saveBatchToMongo(companies, provinceName, provinceSlug) {
  if (!companies || companies.length === 0) return 0;
  const coll = await getMongoCollection();
  if (!coll) return 0;

  try {
    const ops = companies
      .filter((c) => c?.id && c?.name)
      .map((c) => {
        const doc = {
          id: String(c.id).replace(/[^0-9-]/g, ''),
          name: String(c.name).trim(),
          province: provinceName,
          provinceSlug,
          updatedAt: new Date(),
        };
        if (c.representative) doc.representative = String(c.representative).trim();
        if (c.address) doc.address = String(c.address).trim();
        if (c.slug) doc.slug = c.slug;
        if (c.startDate) {
          doc.startDate = c.startDate;
          doc.registrationDate = c.startDate;
        }
        if (c.phone) doc.phone = c.phone;
        if (c.status) doc.status = c.status;
        if (c.mainIndustry) doc.mainIndustry = c.mainIndustry;
        if (c.managedBy) doc.managedBy = c.managedBy;

        return { updateOne: { filter: { id: doc.id }, update: { $set: doc }, upsert: true } };
      });

    if (ops.length === 0) return 0;
    const res = await coll.bulkWrite(ops, { ordered: false });
    return (res.upsertedCount || 0) + (res.modifiedCount || 0);
  } catch (err) {
    console.warn('⚠️ Lỗi khi lưu vào MongoDB:', err?.message || err);
    return 0;
  }
}

// 63 Tỉnh Thành Việt Nam với slug chính xác trên masothue
export const ALL_PROVINCES = [
  { name: 'Hồ Chí Minh', slug: 'ho-chi-minh-23', weight: 4 },
  { name: 'Hà Nội', slug: 'ha-noi-7', weight: 4 },
  { name: 'Bình Dương', slug: 'binh-duong-17', weight: 3 },
  { name: 'Đồng Nai', slug: 'dong-nai-57', weight: 3 },
  { name: 'Đà Nẵng', slug: 'da-nang-35', weight: 2 },
  { name: 'Hải Phòng', slug: 'hai-phong-99', weight: 2 },
  { name: 'Cần Thơ', slug: 'can-tho-96', weight: 2 },
  { name: 'Bắc Ninh', slug: 'bac-ninh-170', weight: 2 },
  { name: 'Bắc Giang', slug: 'bac-giang-72', weight: 2 },
  { name: 'Bà Rịa - Vũng Tàu', slug: 'ba-ria-vung-tau-32', weight: 2 },
  { name: 'Long An', slug: 'long-an-29', weight: 2 },
  { name: 'Hải Dương', slug: 'hai-duong-147', weight: 2 },
  { name: 'Quảng Ninh', slug: 'quang-ninh-142', weight: 2 },
  { name: 'Thanh Hóa', slug: 'thanh-hoa-4', weight: 2 },
  { name: 'Nghệ An', slug: 'nghe-an-144', weight: 2 },
  { name: 'Thừa Thiên Huế', slug: 'thua-thien-hue-66', weight: 1 },
  { name: 'Khánh Hòa', slug: 'khanh-hoa-26', weight: 1 },
  { name: 'Lâm Đồng', slug: 'lam-dong-10', weight: 1 },
  { name: 'Vĩnh Phúc', slug: 'vinh-phuc-420', weight: 1 },
  { name: 'Hưng Yên', slug: 'hung-yen-123', weight: 1 },
  { name: 'Thái Nguyên', slug: 'thai-nguyen-131', weight: 1 },
  { name: 'Nam Định', slug: 'nam-dinh-137', weight: 1 },
  { name: 'Thái Bình', slug: 'thai-binh-128', weight: 1 },
  { name: 'Ninh Bình', slug: 'ninh-binh-75', weight: 1 },
  { name: 'Hà Nam', slug: 'ha-nam-162', weight: 1 },
  { name: 'Phú Thọ', slug: 'phu-tho-134', weight: 1 },
  { name: 'Bình Định', slug: 'binh-dinh-152', weight: 1 },
  { name: 'Quảng Nam', slug: 'quang-nam-49', weight: 1 },
  { name: 'Quảng Ngãi', slug: 'quang-ngai-301', weight: 1 },
  { name: 'Bình Thuận', slug: 'binh-thuan-20', weight: 1 },
  { name: 'Bình Phước', slug: 'binh-phuoc-1', weight: 1 },
  { name: 'Tây Ninh', slug: 'tay-ninh-90', weight: 1 },
  { name: 'Tiền Giang', slug: 'tien-giang-177', weight: 1 },
  { name: 'Bến Tre', slug: 'ben-tre-185', weight: 1 },
  { name: 'Đồng Tháp', slug: 'dong-thap-63', weight: 1 },
  { name: 'An Giang', slug: 'an-giang-93', weight: 1 },
  { name: 'Kiên Giang', slug: 'kien-giang-80', weight: 1 },
  { name: 'Cà Mau', slug: 'ca-mau-108', weight: 1 },
  { name: 'Bạc Liêu', slug: 'bac-lieu-197', weight: 1 },
  { name: 'Sóc Trăng', slug: 'soc-trang-949', weight: 1 },
  { name: 'Trà Vinh', slug: 'tra-vinh-41', weight: 1 },
  { name: 'Vĩnh Long', slug: 'vinh-long-193', weight: 1 },
  { name: 'Hậu Giang', slug: 'hau-giang-190', weight: 1 },
  { name: 'Đắk Lắk', slug: 'dak-lak-214', weight: 1 },
  { name: 'Đắk Nông', slug: 'dak-nong-245', weight: 1 },
  { name: 'Gia Lai', slug: 'gia-lai-563', weight: 1 },
  { name: 'Kon Tum', slug: 'kon-tum-956', weight: 1 },
  { name: 'Hà Tĩnh', slug: 'ha-tinh-342', weight: 1 },
  { name: 'Quảng Bình', slug: 'quang-binh-60', weight: 1 },
  { name: 'Quảng Trị', slug: 'quang-tri-69', weight: 1 },
  { name: 'Phú Yên', slug: 'phu-yen-14', weight: 1 },
  { name: 'Ninh Thuận', slug: 'ninh-thuan-11', weight: 1 },
  { name: 'Hòa Bình', slug: 'hoa-binh-786', weight: 1 },
  { name: 'Sơn La', slug: 'son-la-316', weight: 1 },
  { name: 'Điện Biên', slug: 'dien-bien-1007', weight: 1 },
  { name: 'Lai Châu', slug: 'lai-chau-2501', weight: 1 },
  { name: 'Lào Cai', slug: 'lao-cai-320', weight: 1 },
  { name: 'Yên Bái', slug: 'yen-bai-724', weight: 1 },
  { name: 'Lạng Sơn', slug: 'lang-son-984', weight: 1 },
  { name: 'Tuyên Quang', slug: 'tuyen-quang-1284', weight: 1 },
  { name: 'Hà Giang', slug: 'ha-giang-529', weight: 1 },
  { name: 'Cao Bằng', slug: 'cao-bang-1612', weight: 1 },
  { name: 'Bắc Kạn', slug: 'bac-kan-1127', weight: 1 },
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchProvincePage(provinceSlug, page = 1, retries = 3) {
  const url = `https://masothue.com/tra-cuu-ma-so-thue-theo-tinh/${provinceSlug}?page=${page}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
          'Referer': 'https://masothue.com/',
          'Cache-Control': 'no-cache',
        },
      });

      if (res.status === 429) {
        const backoff = 1800 * attempt;
        await sleep(backoff);
        continue;
      }

      if (res.status !== 200) {
        return { status: res.status, companies: [] };
      }

      const html = await res.text();
      const blocks = html.split('<div data-prefetch=');
      const companies = [];

      for (let i = 1; i < blocks.length; i++) {
        const b = blocks[i];
        const slugMatch = b.match(/['"](\/[^'"]+)['"]/);
        const nameMatch = b.match(/<h3><a[^>]*>([^<]+)<\/a><\/h3>/);
        const idMatch = b.match(/Mã số thuế:\s*<a[^>]*>([^<]+)<\/a>/);
        const repMatch = b.match(/Người đại diện:\s*<em><a[^>]*>([^<]+)<\/a><\/em>/);
        const addrMatch = b.match(/<address><i[^>]*><\/i>([^<]+)<\/address>/);

        if (idMatch && nameMatch) {
          const id = idMatch[1].trim();
          const name = nameMatch[1].trim();
          const slug = slugMatch ? slugMatch[1].replace(/^\//, '') : `${id}-${name}`;
          companies.push({
            id,
            name,
            slug,
            representative: repMatch ? repMatch[1].trim() : '',
            address: addrMatch ? addrMatch[1].trim() : '',
          });
        }
      }

      return { status: 200, companies };
    } catch (err) {
      if (attempt === retries) return { status: 500, companies: [] };
      await sleep(1500);
    }
  }
  return { status: 429, companies: [] };
}

/**
 * Cào thông tin chi tiết THẬT (Ngày thành lập thật, SĐT thật, Trạng thái, Ngành nghề, Cơ quan quản lý)
 */
async function fetchCompanyDetail(slug, defaultId = '') {
  if (!slug) return null;
  const url = `https://masothue.com/${slug}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
          'Referer': 'https://masothue.com/',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (res.status === 429 || res.status === 403) {
        await sleep(5000 * attempt);
        continue;
      }
      if (res.status !== 200) return null;

      const html = await res.text();
      const tableMatch = html.match(/<table[^>]*class=["'][^"']*table-taxinfo[^"']*["'][^>]*>([\s\S]*?)<\/table>/i);
      if (!tableMatch) return null;

      const rows = (tableMatch[1].match(/<tr[\s\S]*?<\/tr>/gi) || []);

      let startDate = '';
      let phone = '';
      let status = 'Đang hoạt động';
      let managedBy = '';
      let mainIndustry = '';
      let internationalName = '';
      let representative = '';

      // 1. Trích xuất SĐT thật từ id="tel-full" hoặc itemprop="telephone"
      const telFullMatch = html.match(/id=['"]tel-full['"][^>]*>([^<]+)<\/span>/i);
      if (telFullMatch) {
        phone = telFullMatch[1].trim();
      } else {
        const telPropMatch = html.match(/itemprop=['"]telephone['"][^>]*>([\s\S]*?)<\/td>/i);
        if (telPropMatch) {
          const rawP = cleanText(telPropMatch[1]).replace(/Ẩn số điện thoại/gi, '').trim();
          if (rawP && !rawP.toLowerCase().includes('bị ẩn') && /\d/.test(rawP)) {
            phone = rawP;
          }
        }
      }

      // 2. Parse các hàng trong table-taxinfo
      for (const row of rows) {
        const text = cleanText(row);
        if (text.includes('Ngày hoạt động') || text.includes('Ngày cấp') || text.includes('Ngày bắt đầu')) {
          const mYMD = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
          const mDMY = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
          if (mYMD) {
            startDate = mYMD[1];
          } else if (mDMY) {
            const [d, m, y] = mDMY[1].split('/');
            startDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
        } else if (!phone && text.includes('Điện thoại')) {
          const cleanP = text.replace(/^Điện thoại\s*/i, '').replace(/Ẩn số điện thoại/gi, '').trim();
          if (cleanP && !cleanP.toLowerCase().includes('bị ẩn') && /\d/.test(cleanP)) {
            phone = cleanP;
          }
        } else if (text.includes('Tình trạng')) {
          const rawS = text.replace(/^Tình trạng\s*/i, '').trim();
          if (rawS.toLowerCase().includes('đang hoạt động')) status = 'Đang hoạt động';
          else if (rawS.toLowerCase().includes('ngừng') || rawS.toLowerCase().includes('đóng')) status = 'Ngừng hoạt động';
          else status = rawS.split(' ')[0] || rawS;
        } else if (text.includes('Quản lý bởi')) {
          managedBy = text.replace(/^Quản lý bởi\s*/i, '').trim();
        } else if (text.includes('Ngành nghề chính')) {
          mainIndustry = text.replace(/^Ngành nghề chính\s*/i, '').trim();
        } else if (text.includes('Tên quốc tế')) {
          internationalName = text.replace(/^Tên quốc tế\s*/i, '').trim();
        } else if (text.includes('Người đại diện')) {
          representative = text.replace(/^Người đại diện\s*/i, '').trim();
        }
      }

      return {
        startDate,
        phone: phone || undefined,
        status,
        managedBy: managedBy || undefined,
        mainIndustry: mainIndustry || undefined,
        internationalName: internationalName || undefined,
        representative: representative || undefined,
      };
    } catch (err) {
      if (attempt === 2) return null;
      await sleep(1500);
    }
  }
  return null;
}

/**
 * Hàm crawler chính
 * @param {object} options
 * @param {number} [options.targetCount]
 * @param {string} [options.dataPath]
 * @param {boolean} [options.enrichDetails]
 * @param {number} [options.enrichCount]
 * @param {((p: any) => void) | null} [options.onProgress]
 */
export async function runCrawler({
  targetCount = 5000,
  enrichDetails = true,
  enrichCount = 5000,
  onProgress = null,
  shouldStop = null,
} = {}) {
  // Dữ liệu chỉ lưu và đọc từ MongoDB (collection companies), không ghi ra file JSON.
  const coll = await getMongoCollection();
  if (!coll) throw new Error('Không kết nối được MongoDB (kiểm tra MONGODB_URI trong .env.local)');

  // 1. Tải MST đã có từ MongoDB để tránh trùng lặp và hỗ trợ chạy tiếp
  const existingIds = new Set();
  const provCounts = new Map();
  for await (const d of coll.find({}, { projection: { id: 1, provinceSlug: 1, _id: 0 } })) {
    if (d.id) existingIds.add(String(d.id));
    if (d.provinceSlug) provCounts.set(d.provinceSlug, (provCounts.get(d.provinceSlug) || 0) + 1);
  }
  let currentTotal = existingIds.size;

  console.log(`
======================================================`);
  console.log(`🚀 BẮT ĐẦU CÀO DỮ LIỆU DOANH NGHIỆP THẬT 100%`);
  console.log(`🎯 Mục tiêu: ${targetCount.toLocaleString('vi-VN')} doanh nghiệp`);
  console.log(`🗄️ Nơi lưu trữ: MongoDB (collection companies)`);
  console.log(`📊 Dữ liệu hiện có: ${currentTotal.toLocaleString('vi-VN')} DN`);
  console.log(`⚙️ Chế độ bổ sung chi tiết (SĐT, Ngày): ${enrichDetails ? `Có (tối đa ${enrichCount})` : 'Tắt'}`);
  console.log(`======================================================
`);

  let newAdded = 0;
  if (currentTotal >= targetCount) {
    console.log(`ℹ️ Dữ liệu hiện có (${currentTotal.toLocaleString('vi-VN')} DN) đã đạt mức mục tiêu (${targetCount.toLocaleString('vi-VN')}). Không cần cào thêm danh sách mới, chuyển sang bước bổ sung chi tiết SĐT & Ngày.`);
  }

  // Theo dõi số trang hiện tại của từng tỉnh để tiếp tục cào ngay trang mới (tránh gọi lại các trang đã cào)
  const provPageMap = new Map();
  for (const prov of ALL_PROVINCES) {
    const count = provCounts.get(prov.slug) || 0;
    // Mỗi trang có ~25 DN, bắt đầu ngay từ trang kế tiếp
    provPageMap.set(prov.slug, Math.max(1, Math.floor(count / 25) + 1));
  }

  let round = 1;
  const maxRounds = 50;
  let consecutive403 = 0;

  // Tỉnh đã cào hết trang thì không hỏi lại nữa trong lượt chạy này
  const finishedProvinces = new Set();
  const MAX_PAGES_PER_PROVINCE = 2000;

  // Vòng lặp Round-Robin qua 63 tỉnh để phân bổ đồng đều
  while (currentTotal + newAdded < targetCount && round <= maxRounds) {
    if (shouldStop && shouldStop()) {
      console.log('🛑 Đã nhận lệnh dừng từ người dùng. Đang lưu dữ liệu và thoát...');
      break;
    }

    if (consecutive403 >= 5) {
      console.log(`⚠️ Masothue đang bật Cloudflare WAF (HTTP 403). Đã tự động lưu ${ (currentTotal + newAdded).toLocaleString('vi-VN') } DN an toàn và tạm dừng cào danh sách mới.`);
      break;
    }

    console.log(`\n--- [VÒNG ${round}] Tiếp tục cào dữ liệu mới cho 63 tỉnh thành ---`);

    for (const prov of ALL_PROVINCES) {
      if (shouldStop && shouldStop()) break;
      if (currentTotal + newAdded >= targetCount) break;

      const currentPage = provPageMap.get(prov.slug) || 1;
      // Trước đây mỗi tỉnh bị chặn ở khoảng 12 trang, nên khi kho đã có vài trăm
      // doanh nghiệp mỗi tỉnh thì trang bắt đầu vượt trần và tỉnh đó bị bỏ qua
      // vĩnh viễn - cào mãi cũng không ra thêm. Nay chỉ dừng khi tỉnh đã hết
      // trang thật sự (trang trả về rỗng), theo dõi bằng finishedProvinces.
      if (finishedProvinces.has(prov.slug)) continue;
      if (currentPage > MAX_PAGES_PER_PROVINCE) continue;

      try {
        const { status, companies } = await fetchProvincePage(prov.slug, currentPage);
        provPageMap.set(prov.slug, currentPage + 1);

        if (status === 200 && companies.length === 0) {
          // Trang hợp lệ nhưng không còn doanh nghiệp nào: tỉnh đã cào hết
          finishedProvinces.add(prov.slug);
          console.log(`[${prov.name}] Đã cào hết danh sách (dừng ở trang ${currentPage}).`);
          continue;
        }

        if (status === 200 && companies.length > 0) {
          consecutive403 = 0;
          const freshCompanies = [];
          let addedThisPage = 0;
          for (const comp of companies) {
            if (!existingIds.has(comp.id)) {
              existingIds.add(comp.id);
              freshCompanies.push(comp);
              addedThisPage++;
              newAdded++;

              if (currentTotal + newAdded >= targetCount) break;
            }
          }
          provCounts.set(prov.slug, (provCounts.get(prov.slug) || 0) + addedThisPage);

          console.log(`[${prov.name}] Trang ${currentPage}: +${addedThisPage} DN | Tổng tỉnh: ${provTotal} | Tổng toàn quốc: ${(currentTotal + newAdded).toLocaleString('vi-VN')} / ${targetCount.toLocaleString('vi-VN')}`);

          if (onProgress) {
            onProgress({
              currentTotal: currentTotal + newAdded,
              targetCount,
              percent: Math.min(100, Math.round(((currentTotal + newAdded) / targetCount) * 100)),
              latestCompany: companies[0]?.name || '',
            });
          }

          // Lưu thẳng vào MongoDB sau mỗi trang (chỉ các công ty mới, chưa có trong kho)
          const savedToDb = await saveBatchToMongo(freshCompanies, prov.name, prov.slug);
          if (savedToDb > 0) {
            console.log(`   └─ Đã lưu ${savedToDb} DN vào MongoDB`);
          }

          // Nghỉ điều độ 300-450ms tránh làm tải server & tránh rate limit
          await sleep(300 + Math.random() * 150);
        } else if (status === 404) {
          // Hết trang của tỉnh này
          finishedProvinces.add(prov.slug);
          continue;
        } else {
          console.log(`[${prov.name}] Trang ${currentPage} trả về status ${status}`);
          if (status === 429) {
            await sleep(2500);
          } else if (status === 403) {
            consecutive403++;
            if (consecutive403 >= 5) {
              console.log(`⚠️ Cloudflare masothue trả về 403 liên tiếp. Tạm dừng cào để tránh bị khóa IP.`);
              break;
            }
            await sleep(1500);
          } else {
            await sleep(500);
          }
        }
      } catch (err) {
        console.error(`Lỗi cào ${prov.name} trang ${currentPage}:`, err.message);
        await sleep(500);
      }
    }

    round++;
  }

  // 2. Chế độ bổ sung chi tiết thật nếu được yêu cầu (--enrich)
  if (enrichDetails && enrichCount > 0) {
    console.log(`\n======================================================`);
    console.log(`🔍 BẮT ĐẦU CÀO BỔ SUNG CHI TIẾT (NGÀY THÀNH LẬP, SĐT, NGÀNH NGHỀ)`);
    console.log(`🎯 Số lượng làm giàu: Tối đa ${enrichCount} doanh nghiệp`);
    console.log(`======================================================\n`);

    // Lấy từ MongoDB các công ty còn thiếu SĐT hoặc Ngày, bỏ qua bản ghi vừa làm giàu gần đây
    // (SĐT bị ẩn thì lần nào cũng thiếu, không thử lại liên tục).
    const recentCutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const itemsToEnrich = await coll
      .find(
        {
          slug: { $exists: true, $ne: '' },
          $or: [{ startDate: { $in: [null, ''] } }, { phone: { $in: [null, ''] } }],
          $and: [{ $or: [{ enrichedAt: { $exists: false } }, { enrichedAt: { $lt: recentCutoff } }] }],
        },
        { projection: { _id: 0, id: 1, slug: 1, name: 1, phone: 1, startDate: 1 } },
      )
      .limit(enrichCount)
      .toArray();

    let enrichedTotal = 0;

    for (let i = 0; i < itemsToEnrich.length; i++) {
      if (shouldStop && shouldStop()) {
        console.log('🛑 Đã nhận lệnh dừng từ giao diện. Đang lưu tiến độ...');
        break;
      }

      const item = itemsToEnrich[i];
      try {
        const detail = await fetchCompanyDetail(item.slug, item.id);
        const update = { enrichedAt: new Date(), updatedAt: new Date() };
        if (detail) {
          if (detail.startDate) {
            item.startDate = detail.startDate;
            update.startDate = detail.startDate;
            update.registrationDate = detail.startDate;
          }
          if (detail.phone) {
            item.phone = detail.phone;
            update.phone = detail.phone;
          }
          for (const f of ['status', 'managedBy', 'mainIndustry', 'internationalName', 'representative']) {
            if (detail[f]) update[f] = detail[f];
          }
          enrichedTotal++;
        }
        await coll.updateOne({ id: item.id }, { $set: update });
      } catch (e) {}

      if (onProgress) {
        const currentCount = i + 1;
        const percent = Math.min(100, Math.round((currentCount / Math.max(1, itemsToEnrich.length)) * 100));
        const phoneInfo = item.phone ? ` - 📞 SĐT: ${item.phone}` : '';
        const dateInfo  = item.startDate ? ` - 📅 ${item.startDate}` : '';
        onProgress({
          currentTotal: currentCount,
          targetCount: itemsToEnrich.length,
          percent,
          latestCompany: `${(item.name || item.id).substring(0, 35)}${phoneInfo}${dateInfo}`,
        });
      }

      if (i < itemsToEnrich.length - 1) {
        const jitter = Math.floor(Math.random() * 500);
        await sleep(3000 + jitter);
      }
    }

    console.log(`✅ Đã bổ sung chi tiết thật cho ${enrichedTotal} doanh nghiệp.`);
  }

  const finalTotal = currentTotal + newAdded;
  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN TẤT THU THẬP DỮ LIỆU!`);
  console.log(`📈 Số DN mới thêm: +${newAdded.toLocaleString('vi-VN')}`);
  console.log(`🏆 Tổng số doanh nghiệp trong CSDL: ${finalTotal.toLocaleString('vi-VN')}`);
  console.log(`💾 Đã lưu vào MongoDB`);
  console.log(`======================================================\n`);

  return { total: finalTotal, newAdded };
}

// Chạy trực tiếp từ dòng lệnh (CLI)
const isCLI = process.argv[1] && (
  process.argv[1].endsWith('crawler.mjs') ||
  process.argv[1].includes('crawler')
);

if (isCLI) {
  const args = process.argv.slice(2);
  let target = 5000;
  let enrich = false;
  let enrichCount = 500;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) {
      target = parseInt(args[i + 1], 10) || 5000;
    }
    if (args[i] === '--enrich') {
      enrich = true;
    }
    if (args[i] === '--enrich-count' && args[i + 1]) {
      enrichCount = parseInt(args[i + 1], 10) || 500;
    }
  }

  runCrawler({
    targetCount: target,
    enrichDetails: enrich,
    enrichCount,
  }).catch((err) => {
    console.error('Lỗi khi chạy crawler:', err);
    process.exit(1);
  });
}
