/**
 * Script bổ sung SĐT THẬT + Ngày THẬT cho toàn bộ doanh nghiệp từ masothue.com
 * Dữ liệu THỰC TẾ, KHÔNG sinh dữ liệu giả/ảo.
 *
 * Cách dùng:
 *   node scripts/fast-enrich-all.mjs                 (chạy bình thường)
 *   node scripts/fast-enrich-all.mjs --limit 10      (test thử 10 bản ghi)
 *   node scripts/fast-enrich-all.mjs --delay 3500    (chỉnh thời gian delay, ms)
 */

import fs from 'fs';
import path from 'path';

// ────────────────────────────────────────────────────────────
// Cấu hình tham số
// ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag, defaultVal) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
};

const DELAY_MS   = parseInt(getArg('--delay', '3500'));
const LIMIT      = parseInt(getArg('--limit', '0'));
const DATA_FILE  = path.resolve('./src/data/harvested_provinces.json');
const COPY_FILE  = path.resolve('./scripts/harvested_provinces.json');
const SAVE_EVERY = 25;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
];

const getRandUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/**
 * Fetch và parse thông tin THẬT từ masothue.com/{slug}
 */
async function fetchMasothueDetail(slug) {
  if (!slug) return null;
  const url = `https://masothue.com/${slug}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': getRandUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
          'Referer': 'https://masothue.com/',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (res.status === 429 || res.status === 403) {
        console.warn(`  ⚠️ Rate limit (${res.status}), tạm dừng ${10000 * attempt}ms...`);
        await sleep(10000 * attempt);
        continue;
      }

      if (res.status === 404) {
        return { notFound: true };
      }

      if (res.status !== 200) {
        return null;
      }

      const html = await res.text();
      const tableMatch = html.match(/<table[^>]*class=["'][^"']*table-taxinfo[^"']*["'][^>]*>([\s\S]*?)<\/table>/i);
      if (!tableMatch) return { notFound: false };

      const rows = (tableMatch[1].match(/<tr[\s\S]*?<\/tr>/gi) || []);
      let startDate = '';
      let phone = '';
      let status = '';
      let managedBy = '';
      let mainIndustry = '';
      let representative = '';

      // 1. Lấy SĐT chuẩn từ id="tel-full" hoặc itemprop="telephone"
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

        // Ngày hoạt động / ngày cấp
        if (text.includes('Ngày hoạt động') || text.includes('Ngày cấp') || text.includes('Ngày bắt đầu')) {
          const mYMD = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
          const mDMY = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
          if (mYMD) {
            startDate = mYMD[1];
          } else if (mDMY) {
            const [d, m, y] = mDMY[1].split('/');
            startDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
        }
        // Fallback lấy SĐT nếu regex itemprop chưa lấy được
        else if (!phone && text.includes('Điện thoại')) {
          const cleanP = text
            .replace(/^Điện thoại\s*/i, '')
            .replace(/Ẩn số điện thoại/gi, '')
            .replace(/\[.*?\]/g, '')
            .trim();
          if (cleanP && !cleanP.toLowerCase().includes('bị ẩn') && /\d/.test(cleanP)) {
            phone = cleanP;
          }
        }
        // Tình trạng hoạt động
        else if (text.includes('Tình trạng')) {
          const rawStatus = text.replace(/^Tình trạng\s*/i, '').trim();
          if (rawStatus.toLowerCase().includes('đang hoạt động')) {
            status = 'Đang hoạt động';
          } else if (rawStatus.toLowerCase().includes('ngừng') || rawStatus.toLowerCase().includes('đóng')) {
            status = 'Ngừng hoạt động';
          } else {
            status = rawStatus.split(' ')[0] || rawStatus;
          }
        }
        // Cơ quan thuế quản lý
        else if (text.includes('Quản lý bởi')) {
          managedBy = text.replace(/^Quản lý bởi\s*/i, '').trim();
        }
        // Ngành nghề kinh doanh chính
        else if (text.includes('Ngành nghề chính')) {
          mainIndustry = text.replace(/^Ngành nghề chính\s*/i, '').trim();
        }
        // Người đại diện pháp luật
        else if (text.includes('Người đại diện')) {
          representative = text.replace(/^Người đại diện\s*/i, '').trim();
        }
      }

      return {
        startDate,
        phone,
        status,
        managedBy,
        mainIndustry,
        representative,
        notFound: false,
      };
    } catch (err) {
      if (attempt === 3) return null;
      await sleep(2000 * attempt);
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────
// Hàm chính
// ────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ Không tìm thấy file dữ liệu: ${DATA_FILE}`);
    process.exit(1);
  }

  console.log(`📂 Đọc dữ liệu từ: ${DATA_FILE}`);
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);

  // Thu thập danh sách cần bổ sung
  const toEnrich = [];
  for (const [provinceSlug, list] of Object.entries(data)) {
    if (!Array.isArray(list)) continue;
    for (const comp of list) {
      // Chỉ xử lý bản ghi chưa được enrich hoặc thiếu ngày/SĐT
      const needPhone = !comp.phone || comp.phone === 'Bị ẩn theo yêu cầu người dùng';
      const needDate = !comp.startDate;

      if ((needPhone || needDate) && !comp.enrichedAt && comp.slug) {
        toEnrich.push({ comp, provinceSlug });
      }
    }
  }

  const allCount = Object.values(data).filter(Array.isArray).flat().length;
  const total = LIMIT > 0 ? Math.min(LIMIT, toEnrich.length) : toEnrich.length;

  console.log(`\n============================================================`);
  console.log(`📊 TỔNG DOANH NGHIỆP TRONG DB   : ${allCount}`);
  console.log(`🔍 CẦN BỔ SUNG DỮ LIỆU THẬT    : ${toEnrich.length}`);
  console.log(`⚙️  MỤC TIÊU LẦN NÀY             : ${total} bản ghi`);
  console.log(`⏱️  DELAY GIỮA MỖI REQUEST       : ${DELAY_MS} ms`);
  console.log(`============================================================\n`);

  if (total === 0) {
    console.log('✅ Toàn bộ doanh nghiệp đã được kiểm tra và bổ sung đầy đủ!');
    return;
  }

  let done = 0;
  let enrichedPhoneCount = 0;
  let enrichedDateCount = 0;
  let notFoundCount = 0;

  const saveData = () => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    if (fs.existsSync(COPY_FILE)) {
      fs.writeFileSync(COPY_FILE, JSON.stringify(data, null, 2), 'utf8');
    }
  };

  // Bắt tín hiệu Ctrl+C để lưu dữ liệu trước khi thoát
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Đã nhận tín hiệu dừng! Đang lưu tiến độ...');
    saveData();
    console.log('💾 Đã lưu dữ liệu an toàn. Tạm biệt!');
    process.exit(0);
  });

  for (let i = 0; i < total; i++) {
    const { comp } = toEnrich[i];
    done++;

    const detail = await fetchMasothueDetail(comp.slug);

    if (detail && !detail.notFound) {
      let gotNewPhone = false;
      let gotNewDate = false;

      if (detail.startDate && !comp.startDate) {
        comp.startDate = detail.startDate;
        gotNewDate = true;
        enrichedDateCount++;
      }

      if (detail.phone && (!comp.phone || comp.phone === 'Bị ẩn theo yêu cầu người dùng')) {
        comp.phone = detail.phone;
        gotNewPhone = true;
        enrichedPhoneCount++;
      }

      if (detail.status && !comp.status) comp.status = detail.status;
      if (detail.managedBy && !comp.managedBy) comp.managedBy = detail.managedBy;
      if (detail.mainIndustry && !comp.mainIndustry) comp.mainIndustry = detail.mainIndustry;
      if (detail.representative && !comp.representative) comp.representative = detail.representative;

      // Đánh dấu đã xác thực từ masothue
      comp.enrichedAt = new Date().toISOString();

      const phoneStr = comp.phone ? `📞 ${comp.phone}` : '📵 (ẩn/chưa có)';
      const dateStr  = comp.startDate ? `📅 ${comp.startDate}` : '❓ (chưa có ngày)';
      const nameStr  = (comp.name || comp.id).substring(0, 36).padEnd(36);

      console.log(`[${done}/${total}] ✅ ${nameStr} | ${phoneStr} | ${dateStr}`);
    } else if (detail && detail.notFound) {
      notFoundCount++;
      comp.enrichedAt = new Date().toISOString(); // Đã check nhưng ko có trên web
      console.log(`[${done}/${total}] ⚠️ 404 Không tìm thấy: ${comp.id} (${comp.slug.substring(0, 35)})`);
    } else {
      console.log(`[${done}/${total}] ❌ Lỗi kết nối: ${comp.id}`);
    }

    // Tự động lưu định kỳ
    if (done % SAVE_EVERY === 0 || done === total) {
      saveData();
      const pct = ((done / total) * 100).toFixed(1);
      console.log(`\n💾 Đã lưu tiến độ [${pct}%] — 📞 +${enrichedPhoneCount} SĐT | 📅 +${enrichedDateCount} Ngày | ⚠️ ${notFoundCount} 404\n`);
    }

    if (i < total - 1) {
      const jitter = Math.floor(Math.random() * 500);
      await sleep(DELAY_MS + jitter);
    }
  }

  saveData();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎉 HOÀN THÀNH QUÁ TRÌNH BỔ SUNG DỮ LIỆU THẬT!`);
  console.log(`   Tổng đã kiểm tra  : ${done}`);
  console.log(`   Đã bổ sung SĐT thật: ${enrichedPhoneCount}`);
  console.log(`   Đã bổ sung Ngày thật: ${enrichedDateCount}`);
  console.log(`   Không tìm thấy (404): ${notFoundCount}`);
  console.log(`   File đã cập nhật   : ${DATA_FILE}`);
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch((err) => {
  console.error('Lỗi nghiêm trọng:', err);
  process.exit(1);
});
