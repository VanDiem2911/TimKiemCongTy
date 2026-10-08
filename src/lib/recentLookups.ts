import fs from 'fs';
import path from 'path';
import { BusinessTaxInfo } from '@/types/tax';
import { INITIAL_COMPANIES, normalizeTaxId } from '@/lib/constants';
import { getDb, isMongoConfigured } from '@/lib/mongodb';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'recent_lookups.json');
const TMP_DATA_FILE = path.join('/tmp', 'recent_lookups.json');

// In-memory store
let RECENT_LOOKUPS: BusinessTaxInfo[] = [];

// Seed with default initial companies
function getInitialSeed(): BusinessTaxInfo[] {
  return INITIAL_COMPANIES.slice(0, 10).map((c, idx) => ({
    ...c,
    id: normalizeTaxId(c.id),
    lastUpdated: `${idx + 1} phút trước`
  }));
}

// Load from disk on startup
function loadFromDisk(): BusinessTaxInfo[] {
  try {
    if (fs.existsSync(TMP_DATA_FILE)) {
      const raw = fs.readFileSync(TMP_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: BusinessTaxInfo) => ({
          ...item,
          id: normalizeTaxId(item.id)
        }));
      }
    }
  } catch {}

  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: BusinessTaxInfo) => ({
          ...item,
          id: normalizeTaxId(item.id)
        }));
      }
    }
  } catch (err) {
    console.warn('Không thể đọc file recent_lookups.json:', err);
  }
  return getInitialSeed();
}

function saveToDisk(list: BusinessTaxInfo[]) {
  const normalizedList = list.slice(0, 50).map(c => ({
    ...c,
    id: normalizeTaxId(c.id)
  }));

  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(normalizedList, null, 2), 'utf-8');
  } catch {}

  try {
    const tmpDir = path.dirname(TMP_DATA_FILE);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(TMP_DATA_FILE, JSON.stringify(normalizedList, null, 2), 'utf-8');
  } catch {}
}

// Initialize memory cache
RECENT_LOOKUPS = loadFromDisk();

export function getRecentLookups(): BusinessTaxInfo[] {
  if (RECENT_LOOKUPS.length === 0) {
    RECENT_LOOKUPS = loadFromDisk();
  }
  return RECENT_LOOKUPS;
}

export async function getRecentLookupsAsync(): Promise<BusinessTaxInfo[]> {
  const localList = getRecentLookups();
  if (!isMongoConfigured()) return localList;

  try {
    const db = await getDb();
    if (!db) return localList;

    const coll = db.collection<BusinessTaxInfo & { updatedAt?: Date }>('recent_lookups');
    const docs = await coll.find({}, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).limit(30).toArray();
    if (docs.length > 0) {
      RECENT_LOOKUPS = docs.map(d => ({
        id: normalizeTaxId(d.id),
        name: d.name,
        representative: d.representative,
        address: d.address,
        status: d.status,
        province: d.province,
        startDate: d.startDate,
        registrationDate: d.registrationDate,
        lastUpdated: d.lastUpdated || 'Gần đây'
      }));
      return RECENT_LOOKUPS;
    } else if (localList.length > 0) {
      // Seed initial data to MongoDB
      await coll.insertMany(
        localList.map((c, i) => ({ ...c, updatedAt: new Date(Date.now() - i * 60000) }))
      );
    }
  } catch (err) {
    console.warn('MongoDB getRecentLookupsAsync error:', err);
  }

  return localList;
}

export function recordRecentLookup(company: Partial<BusinessTaxInfo> & { id: string; name: string }): BusinessTaxInfo[] {
  if (!company || !company.id || !company.name) return RECENT_LOOKUPS;

  const cleanId = normalizeTaxId(company.id.trim());
  const existingIndex = RECENT_LOOKUPS.findIndex(c => c.id === cleanId);

  const fullCompany: BusinessTaxInfo = {
    id: cleanId,
    name: company.name.trim(),
    representative: company.representative || 'Đang cập nhật',
    address: company.address || 'Việt Nam',
    status: company.status || '',
    province: company.province,
    startDate: company.startDate,
    registrationDate: company.registrationDate,
    lastUpdated: 'Vừa xong'
  };

  if (existingIndex !== -1) {
    const old = RECENT_LOOKUPS[existingIndex];
    fullCompany.representative = company.representative || old.representative || 'Đang cập nhật';
    fullCompany.address = company.address || old.address || 'Việt Nam';
    fullCompany.status = company.status || old.status || 'NNT đang hoạt động (đã được cấp GCN ĐKT)';
    fullCompany.province = company.province || old.province;
    RECENT_LOOKUPS.splice(existingIndex, 1);
  }

  RECENT_LOOKUPS.unshift(fullCompany);

  if (RECENT_LOOKUPS.length > 50) {
    RECENT_LOOKUPS = RECENT_LOOKUPS.slice(0, 50);
  }

  saveToDisk(RECENT_LOOKUPS);
  return RECENT_LOOKUPS;
}

export async function recordRecentLookupAsync(company: Partial<BusinessTaxInfo> & { id: string; name: string }): Promise<BusinessTaxInfo[]> {
  const updatedList = recordRecentLookup(company);
  if (!isMongoConfigured()) return updatedList;

  try {
    const db = await getDb();
    if (!db) return updatedList;

    const cleanId = normalizeTaxId(company.id.trim());
    const topItem = updatedList.find(c => c.id === cleanId);
    if (topItem) {
      await db.collection('recent_lookups').updateOne(
        { id: cleanId },
        { $set: { ...topItem, updatedAt: new Date() } },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn('MongoDB recordRecentLookupAsync error:', err);
  }

  return updatedList;
}
