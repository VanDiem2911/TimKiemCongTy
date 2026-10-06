import fs from 'fs';
import path from 'path';
import { BusinessTaxInfo } from '@/types/tax';
import { INITIAL_COMPANIES, normalizeTaxId } from '@/lib/constants';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'recent_lookups.json');

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
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const normalizedList = list.slice(0, 50).map(c => ({
      ...c,
      id: normalizeTaxId(c.id)
    }));
    fs.writeFileSync(DATA_FILE, JSON.stringify(normalizedList, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Không thể ghi file recent_lookups.json:', err);
  }
}

// Initialize memory cache
RECENT_LOOKUPS = loadFromDisk();

export function getRecentLookups(): BusinessTaxInfo[] {
  if (RECENT_LOOKUPS.length === 0) {
    RECENT_LOOKUPS = loadFromDisk();
  }
  return RECENT_LOOKUPS;
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
    status: company.status || 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
    province: company.province,
    startDate: company.startDate,
    registrationDate: company.registrationDate,
    lastUpdated: 'Vừa xong'
  };

  if (existingIndex !== -1) {
    // Preserve existing rich details if new object is minimal
    const old = RECENT_LOOKUPS[existingIndex];
    fullCompany.representative = company.representative || old.representative || 'Đang cập nhật';
    fullCompany.address = company.address || old.address || 'Việt Nam';
    fullCompany.status = company.status || old.status || 'NNT đang hoạt động (đã được cấp GCN ĐKT)';
    fullCompany.province = company.province || old.province;
    RECENT_LOOKUPS.splice(existingIndex, 1);
  }

  // Prepend to the very front
  RECENT_LOOKUPS.unshift(fullCompany);

  // Keep up to 50 recent companies
  if (RECENT_LOOKUPS.length > 50) {
    RECENT_LOOKUPS = RECENT_LOOKUPS.slice(0, 50);
  }

  saveToDisk(RECENT_LOOKUPS);
  return RECENT_LOOKUPS;
}
