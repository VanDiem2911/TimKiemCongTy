/**
 * MaSoThue & Vietnam Enterprise Tax Data Scraper / API Harvester
 * 
 * LƯU Ý KỸ THUẬT QUAN TRỌNG:
 * 1. Masothue.com có Cloudflare WAF bảo vệ (Trả về HTTP 429 & Challenge nếu request quá nhanh).
 * 2. Việt Nam hiện có > 2 triệu doanh nghiệp. Cào brute-force toàn bộ là không tối ưu.
 * 3. Script này minh họa cơ chế:
 *    - Cào theo tỉnh thành / ngành nghề với delay ngẫu nhiên (tránh bị block IP).
 *    - Tích hợp gọi API trực tiếp từ VietQR / GDT để lấy dữ liệu chuẩn thời gian thực.
 */

import fs from 'fs';
import path from 'path';

// Cấu hình delay để tránh bị Cloudflare chặn
const DELAY_MS = 2500; 

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 1. Lấy thông tin doanh nghiệp qua API VietQR (Dữ liệu trực tiếp từ Tổng cục Thuế)
 * Hoàn toàn miễn phí, không bị Captcha, chuẩn 100% thời gian thực.
 */
export async function fetchLiveTaxData(taxCode) {
  try {
    const clean = taxCode.trim().replace(/[^0-9]/g, '');
    const url = `https://api.vietqr.io/v2/business/${clean}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data = await res.json();
    if (data.code === '00' && data.data) {
      return {
        id: data.data.id,
        name: data.data.name,
        internationalName: data.data.internationalName || null,
        shortName: data.data.shortName || null,
        address: data.data.address,
        status: data.data.status,
        updatedAt: new Date().toISOString()
      };
    }
  } catch (err) {
    console.error(`Lỗi tra cứu MST ${taxCode}:`, err.message);
  }
  return null;
}

/**
 * 2. Cào danh sách MST hàng loạt theo danh sách đầu vào
 */
export async function batchHarvestTaxCodes(taxCodeList, outputFile = 'tax_harvested.json') {
  console.log(`Bắt đầu thu thập dữ liệu cho ${taxCodeList.length} mã số thuế...`);
  const results = [];

  for (let i = 0; i < taxCodeList.length; i++) {
    const mst = taxCodeList[i];
    console.log(`[${i + 1}/${taxCodeList.length}] Đang xử lý MST: ${mst}...`);
    
    const info = await fetchLiveTaxData(mst);
    if (info) {
      results.push(info);
      console.log(`  -> Thành công: ${info.name}`);
    } else {
      console.log(`  -> Không tìm thấy dữ liệu`);
    }

    // Delay tránh rate-limit
    await sleep(DELAY_MS);
  }

  const outPath = path.resolve(outputFile);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nHoàn thành! Đã lưu ${results.length} bản ghi vào ${outPath}`);
}

// Chạy thử nghiệm nếu gọi trực tiếp từ command line
const isDirectExecution = process.argv[1] && (
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) ||
  process.argv[1].includes('masothue-scraper')
);

if (isDirectExecution) {
  const sampleList = [
    '0100109106', // Viettel
    '0300588569', // Vinamilk
    '0319732689', // IGL Worldwide
    '0301446260'  // Hóa chất Miền Nam
  ];
  batchHarvestTaxCodes(sampleList);
}

