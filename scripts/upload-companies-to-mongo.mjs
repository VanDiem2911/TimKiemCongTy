import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

// Load .env.local
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim() || 'timkiemcongty';

async function main() {
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU CÀO DOANH NGHIỆP LÊN MONGO ATLAS 🚀');

  if (!uri) {
    console.error('❌ Không tìm thấy MONGODB_URI trong .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  console.log('✅ Đã kết nối MongoDB Atlas!');
  const db = client.db(dbName);
  const companiesColl = db.collection('companies');
  const industryColl = db.collection('industry_companies');

  // 1. Tạo Index tìm kiếm siêu tốc
  console.log('⚡ Đang khởi tạo Indexes tối ưu tìm kiếm...');
  await companiesColl.createIndex({ id: 1 }, { unique: true });
  await companiesColl.createIndex({ provinceSlug: 1 });
  await companiesColl.createIndex({ name: 'text', representative: 'text', address: 'text' });
  await companiesColl.createIndex({ mainIndustry: 1 });
  await industryColl.createIndex({ industryCode: 1, id: 1 }, { unique: true });

  // 2. Tải dữ liệu cào theo tỉnh thành (harvested_provinces.json)
  const provPath = path.join(process.cwd(), 'src', 'data', 'harvested_provinces.json');
  if (fs.existsSync(provPath)) {
    console.log('\n📦 Đang nạp dữ liệu từ harvested_provinces.json...');
    const provData = JSON.parse(fs.readFileSync(provPath, 'utf-8'));

    const allCompanies = [];
    for (const [provSlug, list] of Object.entries(provData)) {
      for (const item of list) {
        if (!item.id || !item.name) continue;
        allCompanies.push({
          id: String(item.id).trim(),
          name: String(item.name).trim(),
          representative: item.representative || undefined,
          address: item.address || '',
          slug: item.slug || undefined,
          startDate: item.startDate || undefined,
          phone: item.phone && item.phone !== 'Bị ẩn theo yêu cầu người dùng' ? item.phone : undefined,
          status: item.status || 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
          mainIndustry: item.mainIndustry || undefined,
          managedBy: item.managedBy || undefined,
          provinceSlug: provSlug,
          updatedAt: new Date()
        });
      }
    }

    console.log(`📊 Tổng số doanh nghiệp cần tải lên: ${allCompanies.length.toLocaleString()} doanh nghiệp`);

    // Upload theo chunks 1,000 bản ghi
    const CHUNK_SIZE = 1000;
    let uploadedCount = 0;

    for (let i = 0; i < allCompanies.length; i += CHUNK_SIZE) {
      const chunk = allCompanies.slice(i, i + CHUNK_SIZE);
      const ops = chunk.map((comp) => ({
        updateOne: {
          filter: { id: comp.id },
          update: { $set: comp },
          upsert: true
        }
      }));

      await companiesColl.bulkWrite(ops, { ordered: false });
      uploadedCount += chunk.length;
      const percent = Math.min(100, Math.round((uploadedCount / allCompanies.length) * 100));
      process.stdout.write(`   ⏳ Tiến độ: ${uploadedCount.toLocaleString()} / ${allCompanies.length.toLocaleString()} (${percent}%)\r`);
    }

    const totalInDb = await companiesColl.countDocuments();
    console.log(`\n✅ Hoàn thành Collection [companies]: ${totalInDb.toLocaleString()} doanh nghiệp trong Mongo Atlas!`);
  }

  // 3. Tải dữ liệu doanh nghiệp theo mã ngành (cached_industry_companies.json)
  const indPath = path.join(process.cwd(), 'src', 'data', 'cached_industry_companies.json');
  if (fs.existsSync(indPath)) {
    console.log('\n📦 Đang nạp dữ liệu từ cached_industry_companies.json...');
    const indData = JSON.parse(fs.readFileSync(indPath, 'utf-8'));

    const industryItems = [];
    for (const [indCode, list] of Object.entries(indData)) {
      for (const item of list) {
        if (!item.id || !item.name) continue;
        industryItems.push({
          id: String(item.id).trim(),
          industryCode: indCode,
          name: item.name,
          representative: item.representative,
          address: item.address || '',
          status: item.status || 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
          province: item.province,
          industryName: item.industryName || item.mainIndustry,
          mainIndustry: item.mainIndustry || item.industryName,
          phone: item.phone,
          updatedAt: new Date()
        });
      }
    }

    console.log(`📊 Tổng số doanh nghiệp theo ngành cần tải lên: ${industryItems.length.toLocaleString()} bản ghi`);

    const CHUNK_SIZE = 1000;
    for (let i = 0; i < industryItems.length; i += CHUNK_SIZE) {
      const chunk = industryItems.slice(i, i + CHUNK_SIZE);
      const ops = chunk.map((item) => ({
        updateOne: {
          filter: { id: item.id, industryCode: item.industryCode },
          update: { $set: item },
          upsert: true
        }
      }));

      await industryColl.bulkWrite(ops, { ordered: false });
    }

    const totalIndInDb = await industryColl.countDocuments();
    console.log(`✅ Hoàn thành Collection [industry_companies]: ${totalIndInDb.toLocaleString()} bản ghi theo ngành trong Mongo Atlas!`);
  }

  console.log('\n🎉 TOÀN BỘ DỮ LIỆU CÀO DOANH NGHIỆP ĐÃ ĐƯỢC ĐỒNG BỘ THÀNH CÔNG LÊN MONGO ATLAS! 🎉');
  await client.close();
}

main().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
