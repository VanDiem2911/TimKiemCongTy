import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

// Load .env.local manually
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
  console.log('--- KIỂM TRA & ĐỒNG BỘ DỮ LIỆU LÊN MONGO ATLAS ---');

  if (!uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
    console.log('⚠️  Chưa tìm thấy MONGODB_URI trong file .env.local');
    console.log('👉 Hãy mở file .env.local và điền chuỗi kết nối dạng:');
    console.log('   MONGODB_URI=mongodb+srv://username:password@cluster0.xxx.mongodb.net/?retryWrites=true&w=majority');
    process.exit(1);
  }

  console.log(`📡 Đang kết nối tới MongoDB Database: [${dbName}]...`);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

  try {
    await client.connect();
    console.log('✅ KẾT NỐI MONGO ATLAS THÀNH CÔNG!\n');
    const db = client.db(dbName);

    // 1. Đồng bộ contact_messages, privacy_requests, hidden_phones, admin_settings
    const adminStorePath = path.join(process.cwd(), 'src', 'data', 'admin_store.json');
    if (fs.existsSync(adminStorePath)) {
      const adminData = JSON.parse(fs.readFileSync(adminStorePath, 'utf-8'));

      // contact_messages
      if (Array.isArray(adminData.contactMessages) && adminData.contactMessages.length > 0) {
        const msgsColl = db.collection('contact_messages');
        for (const msg of adminData.contactMessages) {
          await msgsColl.updateOne({ id: msg.id }, { $set: msg }, { upsert: true });
        }
        const count = await msgsColl.countDocuments();
        console.log(`📩 Collection [contact_messages]: ${count} tin nhắn`);
      }

      // privacy_requests
      if (Array.isArray(adminData.privacyRequests) && adminData.privacyRequests.length > 0) {
        const reqsColl = db.collection('privacy_requests');
        for (const req of adminData.privacyRequests) {
          await reqsColl.updateOne({ id: req.id }, { $set: req }, { upsert: true });
        }
        const count = await reqsColl.countDocuments();
        console.log(`🔒 Collection [privacy_requests]: ${count} yêu cầu`);
      }

      // hidden_phones
      if (adminData.hiddenPhones && typeof adminData.hiddenPhones === 'object') {
        const phonesColl = db.collection('hidden_phones');
        for (const [taxId, val] of Object.entries(adminData.hiddenPhones)) {
          await phonesColl.updateOne({ taxId }, { $set: { taxId, ...val } }, { upsert: true });
        }
        const count = await phonesColl.countDocuments();
        console.log(`📞 Collection [hidden_phones]: ${count} số điện thoại đã ẩn`);
      }

      // admin_settings
      if (adminData.settings) {
        const setColl = db.collection('admin_settings');
        await setColl.updateOne({ _id: 'main' }, { $set: { settings: adminData.settings } }, { upsert: true });
        console.log(`⚙️  Collection [admin_settings]: Đã đồng bộ cài đặt`);
      }
    }

    console.log('\n🎉 TOÀN BỘ DỮ LIỆU ĐÃ ĐƯỢC LƯU LÊN MONGO ATLAS THÀNH CÔNG!');
  } catch (err) {
    console.error('❌ Lỗi kết nối hoặc ghi dữ liệu vào Mongo Atlas:', err.message);
  } finally {
    await client.close();
  }
}

main();
