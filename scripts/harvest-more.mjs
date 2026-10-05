import fs from 'fs';

const PROVINCE_SLUGS = [
  'ho-chi-minh-23',
  'ha-noi-7',
  'da-nang-35',
  'bac-giang-72',
  'bac-ninh-170'
];

async function harvestPages() {
  const allData = JSON.parse(fs.readFileSync('./scripts/harvested_provinces.json', 'utf8'));

  for (const slug of PROVINCE_SLUGS) {
    for (const page of [2, 3, 4, 5]) {
      try {
        console.log('Fetching', slug, 'page', page);
        await new Promise(r => setTimeout(r, 2000));
        const res = await fetch(`https://masothue.com/tra-cuu-ma-so-thue-theo-tinh/${slug}?page=${page}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (res.status === 200) {
          const html = await res.text();
          const regex = /<div data-prefetch='([^']+)'>[\s\S]*?<h3><a[^>]*>([^<]+)<\/a><\/h3>[\s\S]*?Mã số thuế: <a[^>]*>([^<]+)<\/a>[\s\S]*?(?:Người đại diện: <em><a[^>]*>([^<]+)<\/a><\/em>)?[\s\S]*?<address><i[^>]*><\/i>([^<]+)<\/address>/g;
          let match;
          let added = 0;
          while ((match = regex.exec(html)) !== null) {
            const id = match[3].trim();
            if (!allData[slug].some(x => x.id === id)) {
              allData[slug].push({
                id,
                name: match[2].trim(),
                representative: (match[4] || '').trim(),
                address: match[5].trim(),
                slug: match[1].replace(/^\//, '')
              });
              added++;
            }
          }
          console.log(`Added ${added} companies from ${slug} page ${page}`);
        } else {
          console.log(`Status ${res.status} for ${slug} page ${page}`);
        }
      } catch (e) {
        console.error(slug, e.message);
      }
    }
  }

  fs.writeFileSync('./scripts/harvested_provinces.json', JSON.stringify(allData, null, 2));
  console.log('Finished updating harvested_provinces.json');
}

harvestPages();
