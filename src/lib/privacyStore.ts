import fs from 'fs';
import path from 'path';

export interface PrivacyRequest {
  id: string;
  taxId: string;
  companyName: string;
  phone: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  reason: string;
  identityProof?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string | null;
}

export interface HiddenPhoneRecord {
  originalPhone: string;
  hiddenAt: string;
  reason: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  createdAt: string;
}

export interface AdminSettings {
  siteName: string;
  adminEmail: string;
  autoHide: boolean;
}

export interface AdminStoreData {
  privacyRequests: PrivacyRequest[];
  hiddenPhones: Record<string, HiddenPhoneRecord>;
  restoredPhones?: Record<string, string>;
  contactMessages: ContactMessage[];
  settings: AdminSettings;
}

const STORE_PATH = path.join(process.cwd(), 'src', 'data', 'admin_store.json');

const KNOWN_DEFAULT_PHONES: Record<string, string> = {
  '0300588569': '02854155555', // Vinamilk
  '0100109106': '02462556789', // Viettel
  '0100681592': '02438252526', // Petrovietnam (Tập đoàn Dầu khí / Năng lượng Quốc gia)
  '0319641544': '0908123456',  // DUDI
  '3502593768': '02723778899', // Vina One
  '0319732689': '02839251868', // IGL Worldwide
  '5400575731': '02103846666', // Thinh Thai
  '0301446260': '02838296620', // Hoa Chat Co Ban Mien Nam
};

export function getKnownPhone(taxId: string): string | undefined {
  if (!taxId) return undefined;
  const store = getAdminStore();
  if (store.restoredPhones && store.restoredPhones[taxId]) {
    return store.restoredPhones[taxId];
  }
  if (store.hiddenPhones && store.hiddenPhones[taxId]?.originalPhone) {
    return store.hiddenPhones[taxId].originalPhone;
  }
  const req = store.privacyRequests.find((r) => r.taxId === taxId && r.phone && !r.phone.includes('ẩn'));
  if (req?.phone) return req.phone;
  return KNOWN_DEFAULT_PHONES[taxId];
}

const DEFAULT_STORE: AdminStoreData = {
  privacyRequests: [],
  hiddenPhones: {},
  restoredPhones: {
    '0300588569': '02854155555',
    '0100109106': '02462556789',
  },
  contactMessages: [],
  settings: {
    siteName: 'Tìm Kiếm Công Ty',
    adminEmail: 'admin@timkiemcongty.com',
    autoHide: false,
  },
};

export function getAdminStore(): AdminStoreData {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading admin store:', err);
  }
  return DEFAULT_STORE;
}

export function saveAdminStore(data: AdminStoreData): boolean {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving admin store:', err);
    return false;
  }
}

export function isPhoneHidden(taxId: string): boolean {
  if (!taxId) return false;
  const store = getAdminStore();
  return Boolean(store.hiddenPhones[taxId]);
}

export function submitPrivacyRequest(req: Omit<PrivacyRequest, 'id' | 'status' | 'createdAt' | 'reviewedAt'>): { success: boolean; request: PrivacyRequest } {
  const store = getAdminStore();
  const id = `req-${Date.now()}`;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const shouldAutoHide = store.settings.autoHide;
  const newReq: PrivacyRequest = {
    ...req,
    id,
    status: shouldAutoHide ? 'approved' : 'pending',
    createdAt: now,
    reviewedAt: shouldAutoHide ? now : null,
  };

  store.privacyRequests.unshift(newReq);

  if (shouldAutoHide) {
    store.hiddenPhones[req.taxId] = {
      originalPhone: req.phone || getKnownPhone(req.taxId) || '02854155555',
      hiddenAt: now,
      reason: req.reason,
    };
  }

  saveAdminStore(store);
  return { success: true, request: newReq };
}

export function approvePrivacyRequest(requestId: string): boolean {
  const store = getAdminStore();
  const req = store.privacyRequests.find((r) => r.id === requestId);
  if (!req) return false;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  req.status = 'approved';
  req.reviewedAt = now;

  store.hiddenPhones[req.taxId] = {
    originalPhone: req.phone || getKnownPhone(req.taxId) || '02854155555',
    hiddenAt: now,
    reason: req.reason,
  };

  return saveAdminStore(store);
}

export function rejectPrivacyRequest(requestId: string): boolean {
  const store = getAdminStore();
  const req = store.privacyRequests.find((r) => r.id === requestId);
  if (!req) return false;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  req.status = 'rejected';
  req.reviewedAt = now;

  return saveAdminStore(store);
}

export function restoreCompanyPhone(taxId: string, requestId?: string): { success: boolean; phone: string } {
  const store = getAdminStore();
  if (!store.restoredPhones) {
    store.restoredPhones = {};
  }

  // Preserve the original phone before deleting from hiddenPhones
  const phone =
    store.hiddenPhones[taxId]?.originalPhone ||
    store.privacyRequests.find((r) => r.taxId === taxId)?.phone ||
    getKnownPhone(taxId) ||
    KNOWN_DEFAULT_PHONES[taxId] ||
    '';

  if (phone) {
    store.restoredPhones[taxId] = phone;
  }

  delete store.hiddenPhones[taxId];

  // Update privacy request status so the admin UI reflects that it's no longer approved
  if (requestId) {
    const req = store.privacyRequests.find((r) => r.id === requestId);
    if (req) {
      req.status = 'pending';
    }
  }
  for (const req of store.privacyRequests) {
    if (req.taxId === taxId && req.status === 'approved') {
      req.status = 'pending';
    }
  }

  saveAdminStore(store);
  return { success: true, phone };
}

export function toggleHiddenPhone(taxId: string, phone: string, reason: string = 'Ẩn thủ công từ trang quản trị Admin'): boolean {
  const store = getAdminStore();
  if (store.hiddenPhones[taxId]) {
    restoreCompanyPhone(taxId);
    return true;
  } else {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const resolvedPhone = phone || getKnownPhone(taxId) || '02854155555';
    store.hiddenPhones[taxId] = {
      originalPhone: resolvedPhone,
      hiddenAt: now,
      reason,
    };
    return saveAdminStore(store);
  }
}

export function submitContact(msg: Omit<ContactMessage, 'id' | 'status' | 'createdAt'>): { success: boolean; message: ContactMessage } {
  const store = getAdminStore();
  const id = `msg-${Date.now()}`;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const newMsg: ContactMessage = {
    ...msg,
    id,
    status: 'unread',
    createdAt: now,
  };

  store.contactMessages.unshift(newMsg);
  saveAdminStore(store);
  return { success: true, message: newMsg };
}

export function updateContactStatus(msgId: string, status: 'unread' | 'read' | 'replied'): boolean {
  const store = getAdminStore();
  const msg = store.contactMessages.find((m) => m.id === msgId);
  if (!msg) return false;
  msg.status = status;
  return saveAdminStore(store);
}
