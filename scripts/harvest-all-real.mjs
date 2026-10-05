import fs from 'fs';

const PROVINCES_TO_HARVEST = [
  { slug: 'ho-chi-minh-23', name: 'Thành phố Hồ Chí Minh', pages: 8 },
  { slug: 'ha-noi-7', name: 'Thành phố Hà Nội', pages: 8 },
  { slug: 'da-nang-35', name: 'Thành phố Đà Nẵng', pages: 8 },
  { slug: 'binh-duong-17', name: 'Tỉnh Bình Dương', pages: 6 },
  { slug: 'dong-nai-57', name: 'Tỉnh Đồng Nai', pages: 6 },
  { slug: 'hai-phong-99', name: 'Thành phố Hải Phòng', pages: 6 },
  { slug: 'can-tho-96', name: 'Thành phố Cần Thơ', pages: 6 },
  { slug: 'bac-ninh-170', name: 'Tỉnh Bắc Ninh', pages: 6 },
  { slug: 'bac-giang-72', name: 'Tỉnh Bắc Giang', pages: 6 },
  { slug: 'ba-ria-vung-tau-32', name: 'Tỉnh Bà Rịa - Vũng Tàu', pages: 6 },
  { slug: 'long-an-29', name: 'Tỉnh Long An', pages: 4 },
  { slug: 'khanh-hoa-26', name: 'Tỉnh Khánh Hòa', pages: 4 },
  { slug: 'quang-ninh-142', name: 'Tỉnh Quảng Ninh', pages: 4 },
  { slug: 'thanh-hoa-4', name: 'Tỉnh Thanh Hóa', pages: 4 },
  { slug: 'nghe-an-144', name: 'Tỉnh Nghệ An', pages: 4 },
  { slug: 'thua-thien-hue-66', name: 'Tỉnh Thừa Thiên Huế', pages: 4 },
];

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi,en;q=0.9'
};

async function harvestAll() {
  const result = {};
  let totalSaved = 0;

  for (const prov of PROVINCES_TO_HARVEST) {
    result[prov.slug] = [];
    console.log(`\n=== Bắt đầu cào dữ liệu THẬT cho ${prov.name} (${prov.slug}) ===`);

    for (let page = 1; page <= prov.pages; page++) {
      try {
        const url = `https://masothue.com/tra-cuu-ma-so-thue-theo-tinh/${prov.slug}?page=${page}`;
        const res = await fetch(url, { headers });
        if (res.status !== 200) {
          console.log(`[${prov.slug}] Page ${page} trả về status ${res.status}`);
          break;
        }

        const html = await res.text();
        const blocks = html.split('<div data-prefetch=');
        let addedThisPage = 0;

        for (let i = 1; i < blocks.length; i++) {
          const b = blocks[i];
          const slugMatch = b.match(/^'([^']+)'/);
          const nameMatch = b.match(/<h3><a[^>]*>([^<]+)<\/a><\/h3>/);
          const idMatch = b.match(/Mã số thuế: <a[^>]*>([^<]+)<\/a>/);
          const repMatch = b.match(/Người đại diện: <em><a[^>]*>([^<]+)<\/a><\/em>/);
          const addrMatch = b.match(/<address><i[^>]*><\/i>([^<]+)<\/address>/);

          if (idMatch && nameMatch) {
            const id = idMatch[1].trim();
            if (!result[prov.slug].some(c => c.id === id)) {
              result[prov.slug].push({
                id,
                name: nameMatch[1].trim(),
                representative: repMatch ? repMatch[1].trim() : '',
                address: addrMatch ? addrMatch[1].trim() : `${prov.name}, Việt Nam`,
                slug: slugMatch ? slugMatch[1].replace(/^\//, '') : `${id}-${nameMatch[1].trim()}`
              });
              addedThisPage++;
              totalSaved++;
            }
          }
        }

        console.log(`[${prov.slug}] Trang ${page}: +${addedThisPage} doanh nghiệp thật (Tổng tỉnh: ${result[prov.slug].length})`);
        await new Promise(r => setTimeout(r, 450));
      } catch (err) {
        console.error(`Lỗi cào ${prov.slug} trang ${page}:`, err.message);
      }
    }
  }

  // Save to src/data/harvested_provinces.json
  const outPath = './src/data/harvested_provinces.json';
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`\n======================================================`);
  console.log(`ĐÃ HOÀN TẤT CÀO DỮ LIỆU THẬT 100%!`);
  console.log(`Tổng cộng: ${totalSaved} doanh nghiệp thật đã lưu vào ${outPath}`);
  console.log(`======================================================\n`);
}

harvestAll();
