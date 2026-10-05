import fs from 'fs';

async function extract() {
  const res = await fetch('https://masothue.com/0319641544-cong-ty-tnhh-giai-phap-phan-mem-dudi', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const html = await res.text();
  fs.writeFileSync('dudi_sample.html', html, 'utf-8');
  console.log('Saved dudi_sample.html, length:', html.length);

  // find main content
  const startIdx = html.indexOf('<main id="main"');
  if (startIdx !== -1) {
    const endIdx = html.indexOf('</main>', startIdx);
    console.log(html.substring(startIdx, endIdx + 7));
  }
}

extract();
