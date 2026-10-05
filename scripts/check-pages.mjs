import fs from 'fs';

// Read constants and provinceCompanies
const constantsSrc = fs.readFileSync('./src/lib/constants.ts', 'utf8');
const provSrc = fs.readFileSync('./src/lib/provinceCompanies.ts', 'utf8');

// Let's test via HTTP on localhost:3000!
async function testLocalhost() {
  const provinces = [
    'ha-noi-7',
    'ho-chi-minh-23',
    'da-nang-35',
    'bac-giang-72',
    'bac-ninh-170',
    'an-giang-93',
    'dong-nai-57'
  ];

  for (const slug of provinces) {
    try {
      const res = await fetch(`http://localhost:3000/tra-cuu-ma-so-thue-theo-tinh/${slug}`);
      const text = await res.text();
      const pageMatch = text.match(/Trang (\d+) \/ (\d+)/);
      const totalMatch = text.match(/trong tổng số <strong>(\d+)<\/strong>/);
      console.log(`Province: ${slug} -> Status: ${res.status}, Pages: ${pageMatch ? pageMatch[0] : 'N/A'}, Total: ${totalMatch ? totalMatch[1] : 'N/A'}`);
    } catch (e) {
      console.error(slug, e.message);
    }
  }
}

testLocalhost();
