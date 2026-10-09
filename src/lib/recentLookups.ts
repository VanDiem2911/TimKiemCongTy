import { BusinessTaxInfo } from '@/types/tax';
import { INITIAL_COMPANIES, normalizeTaxId } from '@/lib/constants';
import { getDb, isMongoConfigured } from '@/lib/mongodb';

// Danh sách tra cứu gần đây được lưu và đọc từ MongoDB (collection recent_lookups),
// không còn ghi ra file JSON. Bộ nhớ chỉ là dự phòng khi chưa cấu hình MongoDB.
const COLLECTION = 'recent_lookups';
const MAX_ITEMS = 50;

let MEMORY_FALLBACK: BusinessTaxInfo[] = [];

function getInitialSeed(): BusinessTaxInfo[] {
  return INITIAL_COMPANIES.slice(0, 10).map((c, idx) => ({
    ...c,
    id: normalizeTaxId(c.id),
    lastUpdated: `${idx + 1} phút trước`,
  }));
}

export async function getRecentLookupsAsync(): Promise<BusinessTaxInfo[]> {
  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        const coll = db.collection<BusinessTaxInfo & { updatedAt?: Date }>(COLLECTION);
        const docs = await coll.find({}, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).limit(30).toArray();
        if (docs.length > 0) {
          return docs.map((d) => ({
            id: normalizeTaxId(d.id),
            name: d.name,
            representative: d.representative,
            address: d.address,
            status: d.status,
            province: d.province,
            startDate: d.startDate,
            registrationDate: d.registrationDate,
            lastUpdated: d.lastUpdated || 'Gần đây',
          }));
        }
        // Collection còn trống: nạp danh sách mẫu lần đầu để trang chủ không bị trống
        const seed = getInitialSeed();
        await coll.insertMany(seed.map((c, i) => ({ ...c, updatedAt: new Date(Date.now() - i * 60000) })));
        return seed;
      }
    } catch (err) {
      console.warn('MongoDB getRecentLookupsAsync error:', err);
    }
  }

  return MEMORY_FALLBACK.length > 0 ? MEMORY_FALLBACK : getInitialSeed();
}

export async function recordRecentLookupAsync(
  company: Partial<BusinessTaxInfo> & { id: string; name: string }
): Promise<BusinessTaxInfo[]> {
  if (!company || !company.id || !company.name) return getRecentLookupsAsync();

  const cleanId = normalizeTaxId(company.id.trim());
  const item: BusinessTaxInfo = {
    id: cleanId,
    name: company.name.trim(),
    representative: company.representative || 'Đang cập nhật',
    address: company.address || 'Việt Nam',
    status: company.status || '',
    province: company.province,
    startDate: company.startDate,
    registrationDate: company.registrationDate,
    lastUpdated: 'Vừa xong',
  };

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        const coll = db.collection(COLLECTION);
        // Chỉ ghi đè trường nào thực sự có giá trị, tránh làm mất dữ liệu đã có
        const fields = Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined && v !== ''));
        await coll.updateOne({ id: cleanId }, { $set: { ...fields, updatedAt: new Date() } }, { upsert: true });

        // Giữ tối đa MAX_ITEMS bản ghi mới nhất
        const stale = await coll
          .find({}, { projection: { _id: 1 } })
          .sort({ updatedAt: -1 })
          .skip(MAX_ITEMS)
          .toArray();
        if (stale.length > 0) await coll.deleteMany({ _id: { $in: stale.map((d) => d._id) } });
        return getRecentLookupsAsync();
      }
    } catch (err) {
      console.warn('MongoDB recordRecentLookupAsync error:', err);
    }
  }

  MEMORY_FALLBACK = [item, ...MEMORY_FALLBACK.filter((c) => c.id !== cleanId)].slice(0, MAX_ITEMS);
  return MEMORY_FALLBACK;
}
