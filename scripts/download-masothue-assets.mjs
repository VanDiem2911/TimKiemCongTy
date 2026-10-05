import fs from 'fs';
import path from 'path';

const assets = [
  { url: 'https://static.masothue.com/images/logo-masothue.png', dest: 'public/images/masothue/logo-masothue.png' },
  { url: 'https://static.masothue.com/images/slider/tra-cuu-ma-so-thue-slide-1-min.png', dest: 'public/images/slider/slide-1.png' },
  { url: 'https://static.masothue.com/images/slider/tra-cuu-ma-so-thue-slide-2-min.png', dest: 'public/images/slider/slide-2.png' },
  { url: 'https://static.masothue.com/images/slider/tra-cuu-ma-so-thue-slide-3-min.png', dest: 'public/images/slider/slide-3.png' },
  { url: 'https://static.masothue.com/images/slider/tra-cuu-ma-so-thue-slide-4-min.png', dest: 'public/images/slider/slide-4.png' },
  { url: 'https://static.masothue.com/images/brands/facebook-tra-cuu-ma-so-thue.png', dest: 'public/images/brands/facebook.png' },
  { url: 'https://static.masothue.com/images/brands/zalo-tra-cuu-ma-so-thue.png', dest: 'public/images/brands/zalo.png' },
  { url: 'https://static.masothue.com/images/brands/messenger-tra-cuu-ma-so-thue.png', dest: 'public/images/brands/messenger.png' },
  { url: 'https://static.masothue.com/images/brands/twitter-tra-cuu-ma-so-thue.png', dest: 'public/images/brands/twitter.png' },
  { url: 'https://static.masothue.com/images/brands/pinterest-tra-cuu-ma-so-thue.png', dest: 'public/images/brands/pinterest.png' }
];

async function downloadAll() {
  for (const item of assets) {
    const fullDest = path.resolve(item.dest);
    fs.mkdirSync(path.dirname(fullDest), { recursive: true });
    try {
      console.log(`Downloading ${item.url}...`);
      const res = await fetch(item.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!res.ok) {
        console.error(`Failed ${item.url}: ${res.status}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(fullDest, buffer);
      console.log(`Saved ${item.dest} (${buffer.length} bytes)`);
    } catch (e) {
      console.error(`Error downloading ${item.url}:`, e.message);
    }
  }
}

downloadAll();
