/**
 * Cào doanh nghiệp từ https://www.tratencongty.com và lưu thẳng vào MongoDB (collection `companies`)
 * mà KHÔNG trùng với dữ liệu cũ. Không ghi ra file JSON.
 *
 * Trang nguồn hiển thị Mã số thuế và Số điện thoại dưới dạng ẢNH PNG (base64) nên script dùng OCR
 * (tesseract.js). Độ chính xác được đảm bảo bằng cách:
 *   - MST: OCR ở trang liệt kê VÀ trang chi tiết (2 ảnh khác nhau), chỉ nhận khi 2 kết quả trùng nhau.
 *   - SĐT: OCR 2 lần ở 2 kích thước, chỉ nhận khi trùng nhau (không trùng -> bỏ trống, không ghi sai).
 *
 * Chống trùng: so khớp theo MST, và theo (tên + địa chỉ) chuẩn hoá, với toàn bộ
 * toàn bộ dữ liệu đang có trong MongoDB + dữ liệu mới cào trong cùng lần chạy.
 *
 * Cách dùng:
 *   node scripts/scrape-tratencongty.mjs --from 1 --to 20            # cào trang 1..20
 *   node scripts/scrape-tratencongty.mjs --resume --pages 50         # tiếp tục từ trang đã dừng, 50 trang
 *   node scripts/scrape-tratencongty.mjs --from 1 --to 3 --dry-run   # chạy thử, không ghi file
 * Tuỳ chọn: --max-new N (dừng khi đủ N công ty mới), --delay 1200 (ms giữa 2 request), --workers 3
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import sharp from 'sharp';
import { MongoClient } from 'mongodb';
import { createWorker, PSM } from 'tesseract.js';

const BASE = 'https://www.tratencongty.com';
const ROOT = process.cwd();
// ---------- config (được gán trong runTratencongtyScraper) ----------
let DRY = false;
let DELAY = 1200;
let WORKERS = 3;
let MAX_NEW = Infinity;

function parseCli(argv) {
  const opt = (name, def) => {
    const i = argv.indexOf(`--${name}`);
    if (i === -1) return def;
    const v = argv[i + 1];
    return v === undefined || v.startsWith('--') ? true : v;
  };
  const from = Number(opt('from', 1));
  return {
    dryRun: Boolean(opt('dry-run', false)),
    delay: Number(opt('delay', 1200)),
    workers: Number(opt('workers', 3)),
    maxNew: Number(opt('max-new', Infinity)),
    from,
    to: Number(opt('to', from)),
    resume: Boolean(opt('resume', false)),
    pages: Number(opt('pages', 10)),
  };
}

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
const slugify = (s) => strip(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const normKey = (s) => strip(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
const decodeEntities = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const clean = (s) => decodeEntities(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const toIso = (dmy) => {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(dmy || '');
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : undefined;
};
const nameAddrKey = (name, address) => normKey(name) + '|' + normKey(address).slice(0, 40);

async function fetchText(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' },
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 200) return await res.text();
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) await sleep(5000 * i);
    } catch {
      await sleep(2000 * i);
    }
  }
  return null;
}

// ---------- OCR ----------
const pool = [];
const idle = [];
const waiters = [];
async function initOcr() {
  for (let i = 0; i < WORKERS; i++) {
    const w = await createWorker('eng');
    await w.setParameters({ tessedit_char_whitelist: '0123456789-', tessedit_pageseg_mode: PSM.SINGLE_LINE });
    pool.push(w);
    idle.push(w);
  }
}
async function withWorker(fn) {
  const w = idle.pop() ?? (await new Promise((r) => waiters.push(r)));
  try {
    return await fn(w);
  } finally {
    const next = waiters.shift();
    if (next) next(w);
    else idle.push(w);
  }
}
async function ocrImage(b64, height) {
  const buf = await sharp(Buffer.from(b64, 'base64'))
    .flatten({ background: '#fff' })
    .greyscale()
    .normalise()
    .resize({ height, kernel: 'lanczos3' })
    .extend({ top: 16, bottom: 16, left: 16, right: 16, background: '#fff' })
    .png()
    .toBuffer();
  const { data } = await withWorker((w) => w.recognize(buf));
  return data.text.replace(/[^\d-]/g, '').replace(/^-+|-+$/g, '');
}
const validMst = (s) => /^\d{10}(-\d{3})?$/.test(s);
const validPhone = (s) => /^0\d{9,10}$/.test(s);

// ---------- parsing ----------
function parseListing(html) {
  return html
    .split('class="search-results"')
    .slice(1)
    .map((b) => {
      const link = /<a href="([^"]+\/company\/[^"]+)">([^<]+)<\/a>/.exec(b);
      const img = /base64,([^"]+)"/.exec(b);
      const addr = /Địa chỉ:\s*([\s\S]*?)<\/p>/.exec(b);
      if (!link || !img) return null;
      return { url: link[1], name: clean(link[2]), mstImg: img[1], address: clean(addr?.[1]) };
    })
    .filter(Boolean);
}

function parseDetail(html) {
  const start = html.indexOf('class="jumbotron"');
  if (start === -1) return null;
  const end = html.indexOf('<div align="center">', start);
  const block = html.slice(start, end === -1 ? start + 8000 : end);
  const imgs = [...block.matchAll(/base64,([^"]+)"/g)].map((m) => m[1]);
  const field = (label) => {
    const m = new RegExp(label + ':\\s*([\\s\\S]*?)(?:<br\\s*\\/?>|$)', 'i').exec(block);
    return m ? clean(m[1]) : undefined;
  };
  const title = /<h4>[\s\S]*?<span title="([^"]*)"/.exec(block);
  // "Mã số thuế" và "Điện thoại" là ảnh: lấy ảnh đứng ngay sau nhãn tương ứng
  const imgAfter = (label) => {
    const i = block.indexOf(label);
    if (i === -1) return undefined;
    const m = /base64,([^"]+)"/.exec(block.slice(i));
    return m?.[1];
  };
  return {
    name: clean(title?.[1]),
    internationalName: field('Tên giao dịch'),
    address: field('Địa chỉ'),
    representative: field('Đại diện pháp luật'),
    licenseDate: toIso(field('Ngày cấp giấy phép')),
    startDate: toIso(field('Ngày hoạt động')),
    status: field('Trạng thái'),
    mstImg: imgAfter('Mã số thuế') ?? imgs[0],
    phoneImg: imgAfter('Điện thoại'),
  };
}

// ---------- province mapping ----------
function buildProvinceMap(keys) {
  const map = new Map(); // slug tên tỉnh (không dấu, không hậu tố số) -> provinceSlug trong MongoDB
  for (const key of keys.filter(Boolean)) map.set(key.replace(/-\d+$/, ''), key);
  return map;
}
function provinceOf(address, map) {
  const parts = String(address).split(',').map((s) => s.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0 && i >= parts.length - 2; i--) {
    const p = slugify(parts[i].replace(/^(Thành phố|Tỉnh|TP\.?|T\.)\s+/i, ''));
    const key = map.get(p);
    if (key) return { key, name: parts[i].replace(/^(Thành phố|Tỉnh|TP\.?)\s+/i, '') };
  }
  return null;
}

// ---------- MongoDB ----------
function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    const i = t.indexOf('=');
    if (!t || t.startsWith('#') || i === -1) continue;
    const k = t.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
}
async function connectMongo() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) return null;
  try {
    const client = new MongoClient(uri, { maxPoolSize: 3, serverSelectionTimeoutMS: 15000 });
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME?.trim() || 'timkiemcongty');
    const coll = db.collection('companies');
    await coll.createIndex({ id: 1 }, { unique: true });
    return { client, db, coll };
  } catch (e) {
    console.warn('Không kết nối được MongoDB:', e.message);
    return null;
  }
}

// ---------- main ----------
export async function runTratencongtyScraper(opts = {}) {
  DRY = Boolean(opts.dryRun);
  DELAY = opts.delay ?? 1200;
  WORKERS = opts.workers ?? 3;
  MAX_NEW = opts.maxNew ?? Infinity;
  const shouldStop = opts.shouldStop ?? (() => false);
  const onProgress = opts.onProgress ?? (() => {});
  let fromPage = opts.from ?? 1;
  let toPage = opts.to ?? fromPage;
  pool.length = 0;
  idle.length = 0;
  waiters.length = 0;

  // Dữ liệu chỉ lưu và đọc từ MongoDB, không ghi ra file JSON.
  const mongo = await connectMongo();
  if (!mongo) throw new Error('Không kết nối được MongoDB (kiểm tra MONGODB_URI trong .env.local)');
  const stateColl = mongo.db.collection('scraper_state');
  const rejectColl = mongo.db.collection('scraper_rejects');

  if (opts.resume) {
    const st = await stateColl.findOne({ _id: 'tratencongty' });
    fromPage = st?.nextPage ?? 1;
    toPage = fromPage + (opts.pages ?? 10) - 1;
  }

  // Khóa tỉnh (provinceSlug) lấy từ chính dữ liệu đang có trong MongoDB
  const provMap = buildProvinceMap(await mongo.coll.distinct('provinceSlug'));

  const knownIds = new Set();
  const knownNameAddr = new Set();
  const register = (c) => {
    if (c.id) knownIds.add(String(c.id).trim());
    if (c.name) knownNameAddr.add(nameAddrKey(c.name, c.address));
  };
  const stats = { pages: 0, seen: 0, dupes: 0, added: 0, rejected: 0, mongoSaved: 0, mongoErrors: 0 };
  for await (const c of mongo.coll.find({}, { projection: { id: 1, name: 1, address: 1, _id: 0 } })) register(c);
  console.log('Đã kết nối MongoDB, kho hiện có:', knownIds.size.toLocaleString(), 'MST');

  const pending = [];
  const flushMongo = async () => {
    if (DRY || !pending.length) return;
    const batch = pending.splice(0);
    try {
      const r = await mongo.coll.bulkWrite(
        batch.map(({ rec, provinceSlug }) => ({
          updateOne: { filter: { id: rec.id }, update: { $set: { ...rec, provinceSlug, updatedAt: new Date() } }, upsert: true },
        })),
        { ordered: false },
      );
      stats.mongoSaved += r.upsertedCount + r.modifiedCount;
    } catch (e) {
      stats.mongoErrors++;
      console.warn('Lỗi ghi MongoDB:', e.message);
    }
  };
  console.log(`Cào trang ${fromPage}..${toPage}${DRY ? ' (DRY RUN)' : ''}`);

  await initOcr();
  let nextPage = fromPage;

  const save = async () => {
    await flushMongo();
    if (!DRY) await stateColl.updateOne({ _id: 'tratencongty' }, { $set: { nextPage, updatedAt: new Date() } }, { upsert: true });
  };
  const reject = (reason, info) => {
    stats.rejected++;
    if (!DRY) rejectColl.insertOne({ reason, ...info, at: new Date() }).catch(() => {});
  };

  for (let page = fromPage; page <= toPage && stats.added < MAX_NEW && !shouldStop(); page++) {
    const html = await fetchText(`${BASE}/?page=${page}`);
    if (!html) {
      console.log(`Trang ${page}: không tải được, dừng.`);
      break;
    }
    const items = parseListing(html);
    if (!items.length) {
      console.log(`Trang ${page}: không có dữ liệu, dừng.`);
      break;
    }
    stats.pages++;
    stats.seen += items.length;

    // OCR MST ở trang liệt kê (song song), rồi lọc những công ty đã có
    const listMst = await Promise.all(items.map((it) => ocrImage(it.mstImg, 64)));
    let pageAdded = 0;

    for (let i = 0; i < items.length && stats.added < MAX_NEW && !shouldStop(); i++) {
      const it = items[i];
      const mst1 = listMst[i];
      if ((validMst(mst1) && knownIds.has(mst1)) || knownNameAddr.has(nameAddrKey(it.name, it.address))) {
        stats.dupes++;
        continue;
      }

      await sleep(DELAY);
      const dHtml = await fetchText(it.url);
      const d = dHtml && parseDetail(dHtml);
      if (!d || !d.mstImg) {
        reject('detail-fetch-failed', { url: it.url, name: it.name });
        continue;
      }
      const [mst2a, mst2b] = await Promise.all([ocrImage(d.mstImg, 64), ocrImage(d.mstImg, 48)]);
      // MST hợp lệ khi trang liệt kê và trang chi tiết (2 ảnh khác nhau) cho cùng kết quả
      const mst = mst1 === mst2a || mst1 === mst2b ? mst1 : null;
      if (!mst || !validMst(mst)) {
        reject('mst-mismatch', { url: it.url, name: it.name, list: mst1, detail: [mst2a, mst2b] });
        continue;
      }
      if (knownIds.has(mst)) {
        stats.dupes++;
        continue;
      }

      let phone;
      if (d.phoneImg) {
        const [p1, p2] = await Promise.all([ocrImage(d.phoneImg, 64), ocrImage(d.phoneImg, 48)]);
        if (p1 === p2 && validPhone(p1)) phone = p1;
      }

      const address = d.address || it.address;
      const prov = provinceOf(address, provMap);
      if (!prov) {
        reject('unknown-province', { url: it.url, name: it.name, address });
        continue;
      }
      const name = d.name || it.name;
      const rec = {
        id: mst,
        name,
        representative: (d.representative || '').toUpperCase(),
        address,
        slug: `${mst}-${slugify(name)}`,
        province: prov.name,
        ...(d.startDate && { startDate: d.startDate }),
        ...(d.licenseDate && { licenseDate: d.licenseDate }),
        ...(phone && { phone }),
        ...(d.status && { status: d.status }),
        ...(d.internationalName && { internationalName: d.internationalName }),
        source: 'tratencongty.com',
        scrapedAt: new Date().toISOString(),
      };
      if (DRY) console.log(JSON.stringify(rec));
      pending.push({ rec, provinceSlug: prov.key });
      register(rec);
      stats.added++;
      pageAdded++;
      onProgress({ page, toPage, ...stats, latest: name });
    }

    if (!shouldStop() || pageAdded === items.length) nextPage = page + 1;
    await flushMongo();
    await save();
    onProgress({ page, toPage, ...stats, latest: '' });
    console.log(`Trang ${page}: +${pageAdded} mới / ${items.length} (tổng mới ${stats.added}, trùng ${stats.dupes}, loại ${stats.rejected})`);
    await sleep(DELAY);
  }

  await flushMongo();
  await mongo?.client.close();
  await Promise.all(pool.map((w) => w.terminate()));
  return { ...stats, dryRun: DRY, nextPage };
}

// ---------- CLI ----------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cli = parseCli(process.argv.slice(2));
  console.log(`Cào tratencongty.com${cli.dryRun ? ' (DRY RUN)' : ''}`);
  runTratencongtyScraper({ ...cli, onProgress: (p) => p.latest === '' && console.log(`Trang ${p.page}/${p.toPage}: mới ${p.added}, trùng ${p.dupes}, loại ${p.rejected}`) })
    .then((st) => {
      console.log('Hoàn tất:', st);
      if (st.rejected && !st.dryRun) console.log('Bản ghi bị loại nằm ở collection scraper_rejects trong MongoDB');
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
