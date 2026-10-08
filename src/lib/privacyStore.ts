import fs from 'fs';
import path from 'path';
import { getDb, isMongoConfigured } from './mongodb';

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
const TMP_STORE_PATH = path.join('/tmp', 'admin_store.json');

let IN_MEMORY_STORE: AdminStoreData | null = null;

const KNOWN_DEFAULT_PHONES: Record<string, string> = {
  '0300588569': '02854155555', // Vinamilk
  '0100109106': '02462556789', // Viettel
  '0100681592': '02438252526', // Petrovietnam
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

/** Load initial baseline from local file or default */
function loadDiskStore(): AdminStoreData {
  try {
    if (fs.existsSync(TMP_STORE_PATH)) {
      const raw = fs.readFileSync(TMP_STORE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}

  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading admin store:', err);
  }

  return { ...DEFAULT_STORE };
}

/** Synchronous get for immediate reads */
export function getAdminStore(): AdminStoreData {
  if (IN_MEMORY_STORE) {
    return IN_MEMORY_STORE;
  }
  IN_MEMORY_STORE = loadDiskStore();
  return IN_MEMORY_STORE;
}

/** Asynchronous get with MongoDB syncing */
export async function getAdminStoreAsync(): Promise<AdminStoreData> {
  const localStore = getAdminStore();

  if (!isMongoConfigured()) {
    return localStore;
  }

  try {
    const db = await getDb();
    if (!db) return localStore;

    // 1. Contact messages
    const msgsColl = db.collection<ContactMessage>('contact_messages');
    const msgDocs = await msgsColl.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    let msgs: ContactMessage[] = msgDocs.map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      subject: d.subject,
      message: d.message,
      status: d.status,
      createdAt: d.createdAt,
    }));
    if (msgs.length === 0 && localStore.contactMessages.length > 0) {
      await msgsColl.insertMany(localStore.contactMessages.map((m) => ({ ...m })));
      msgs = localStore.contactMessages;
    }

    // 2. Privacy requests
    const reqsColl = db.collection<PrivacyRequest>('privacy_requests');
    const reqDocs = await reqsColl.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    let reqs: PrivacyRequest[] = reqDocs.map((d) => ({
      id: d.id,
      taxId: d.taxId,
      companyName: d.companyName,
      phone: d.phone,
      requesterName: d.requesterName,
      requesterPhone: d.requesterPhone,
      requesterEmail: d.requesterEmail,
      reason: d.reason,
      identityProof: d.identityProof,
      status: d.status,
      createdAt: d.createdAt,
      reviewedAt: d.reviewedAt,
    }));
    if (reqs.length === 0 && localStore.privacyRequests.length > 0) {
      await reqsColl.insertMany(localStore.privacyRequests.map((r) => ({ ...r })));
      reqs = localStore.privacyRequests;
    }

    // 3. Hidden phones
    const phonesColl = db.collection<{ taxId: string; originalPhone: string; hiddenAt: string; reason: string }>('hidden_phones');
    const phoneDocs = await phonesColl.find({}, { projection: { _id: 0 } }).toArray();
    const hiddenMap: Record<string, HiddenPhoneRecord> = {};
    for (const p of phoneDocs) {
      hiddenMap[p.taxId] = {
        originalPhone: p.originalPhone,
        hiddenAt: p.hiddenAt,
        reason: p.reason
      };
    }

    // 4. Settings
    const settingsColl = db.collection<{ _id: string; settings: AdminSettings }>('admin_settings');
    const settingsDoc = await settingsColl.findOne({ _id: 'main' });

    IN_MEMORY_STORE = {
      privacyRequests: reqs,
      hiddenPhones: Object.keys(hiddenMap).length > 0 ? hiddenMap : localStore.hiddenPhones,
      restoredPhones: localStore.restoredPhones,
      contactMessages: msgs,
      settings: settingsDoc ? settingsDoc.settings : localStore.settings,
    };

    saveAdminStoreLocal(IN_MEMORY_STORE);
    return IN_MEMORY_STORE;
  } catch (err) {
    console.warn('MongoDB sync warning in getAdminStoreAsync:', err);
    return localStore;
  }
}

/** Save locally to memory and disk */
function saveAdminStoreLocal(data: AdminStoreData): boolean {
  IN_MEMORY_STORE = data;
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}

  try {
    const tmpDir = path.dirname(TMP_STORE_PATH);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(TMP_STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}

  return true;
}

export function saveAdminStore(data: AdminStoreData): boolean {
  saveAdminStoreLocal(data);
  saveAdminStoreAsync(data).catch(() => {});
  return true;
}

export async function saveAdminStoreAsync(data: AdminStoreData): Promise<boolean> {
  saveAdminStoreLocal(data);
  if (!isMongoConfigured()) return true;

  try {
    const db = await getDb();
    if (!db) return true;

    // Upsert settings
    await db.collection('admin_settings').updateOne(
      { _id: 'main' as unknown as never },
      { $set: { settings: data.settings } },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.warn('MongoDB save warning in saveAdminStoreAsync:', err);
    return true;
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

  saveAdminStoreLocal(store);
  submitPrivacyRequestAsync(req).catch(() => {});
  return { success: true, request: newReq };
}

export async function submitPrivacyRequestAsync(req: Omit<PrivacyRequest, 'id' | 'status' | 'createdAt' | 'reviewedAt'>): Promise<{ success: boolean; request: PrivacyRequest }> {
  const store = await getAdminStoreAsync();
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

  store.privacyRequests = [newReq, ...store.privacyRequests.filter(r => r.id !== id)];

  if (shouldAutoHide) {
    store.hiddenPhones[req.taxId] = {
      originalPhone: req.phone || getKnownPhone(req.taxId) || '02854155555',
      hiddenAt: now,
      reason: req.reason,
    };
  }

  saveAdminStoreLocal(store);

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        await db.collection('privacy_requests').insertOne({ ...newReq });
        if (shouldAutoHide) {
          await db.collection('hidden_phones').updateOne(
            { taxId: req.taxId },
            { $set: { taxId: req.taxId, originalPhone: store.hiddenPhones[req.taxId].originalPhone, hiddenAt: now, reason: req.reason } },
            { upsert: true }
          );
        }
      }
    } catch (err) {
      console.warn('MongoDB insert privacy request error:', err);
    }
  }

  return { success: true, request: newReq };
}

export function approvePrivacyRequest(requestId: string): boolean {
  approvePrivacyRequestAsync(requestId).catch(() => {});
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
  return saveAdminStoreLocal(store);
}

export async function approvePrivacyRequestAsync(requestId: string): Promise<boolean> {
  const store = await getAdminStoreAsync();
  const req = store.privacyRequests.find((r) => r.id === requestId);
  if (!req) return false;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  req.status = 'approved';
  req.reviewedAt = now;

  const originalPhone = req.phone || getKnownPhone(req.taxId) || '02854155555';
  store.hiddenPhones[req.taxId] = {
    originalPhone,
    hiddenAt: now,
    reason: req.reason,
  };

  saveAdminStoreLocal(store);

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        await db.collection('privacy_requests').updateOne(
          { id: requestId },
          { $set: { status: 'approved', reviewedAt: now } }
        );
        await db.collection('hidden_phones').updateOne(
          { taxId: req.taxId },
          { $set: { taxId: req.taxId, originalPhone, hiddenAt: now, reason: req.reason } },
          { upsert: true }
        );
      }
    } catch (err) {
      console.warn('MongoDB approvePrivacyRequest error:', err);
    }
  }

  return true;
}

export function rejectPrivacyRequest(requestId: string): boolean {
  rejectPrivacyRequestAsync(requestId).catch(() => {});
  const store = getAdminStore();
  const req = store.privacyRequests.find((r) => r.id === requestId);
  if (!req) return false;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  req.status = 'rejected';
  req.reviewedAt = now;
  return saveAdminStoreLocal(store);
}

export async function rejectPrivacyRequestAsync(requestId: string): Promise<boolean> {
  const store = await getAdminStoreAsync();
  const req = store.privacyRequests.find((r) => r.id === requestId);
  if (!req) return false;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  req.status = 'rejected';
  req.reviewedAt = now;
  saveAdminStoreLocal(store);

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        await db.collection('privacy_requests').updateOne(
          { id: requestId },
          { $set: { status: 'rejected', reviewedAt: now } }
        );
      }
    } catch (err) {
      console.warn('MongoDB rejectPrivacyRequest error:', err);
    }
  }

  return true;
}

export function restoreCompanyPhone(taxId: string, requestId?: string): { success: boolean; phone: string } {
  const store = getAdminStore();
  if (!store.restoredPhones) store.restoredPhones = {};

  const phone =
    store.hiddenPhones[taxId]?.originalPhone ||
    store.privacyRequests.find((r) => r.taxId === taxId)?.phone ||
    getKnownPhone(taxId) ||
    KNOWN_DEFAULT_PHONES[taxId] ||
    '';

  if (phone) store.restoredPhones[taxId] = phone;
  delete store.hiddenPhones[taxId];

  if (requestId) {
    const req = store.privacyRequests.find((r) => r.id === requestId);
    if (req) req.status = 'pending';
  }
  for (const req of store.privacyRequests) {
    if (req.taxId === taxId && req.status === 'approved') req.status = 'pending';
  }

  saveAdminStoreLocal(store);
  restoreCompanyPhoneAsync(taxId, requestId).catch(() => {});
  return { success: true, phone };
}

export async function restoreCompanyPhoneAsync(taxId: string, requestId?: string): Promise<{ success: boolean; phone: string }> {
  const store = await getAdminStoreAsync();
  if (!store.restoredPhones) store.restoredPhones = {};

  const phone =
    store.hiddenPhones[taxId]?.originalPhone ||
    store.privacyRequests.find((r) => r.taxId === taxId)?.phone ||
    getKnownPhone(taxId) ||
    KNOWN_DEFAULT_PHONES[taxId] ||
    '';

  if (phone) store.restoredPhones[taxId] = phone;
  delete store.hiddenPhones[taxId];

  if (requestId) {
    const req = store.privacyRequests.find((r) => r.id === requestId);
    if (req) req.status = 'pending';
  }
  for (const req of store.privacyRequests) {
    if (req.taxId === taxId && req.status === 'approved') req.status = 'pending';
  }

  saveAdminStoreLocal(store);

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        await db.collection('hidden_phones').deleteOne({ taxId });
        await db.collection('privacy_requests').updateMany(
          { taxId, status: 'approved' },
          { $set: { status: 'pending' } }
        );
      }
    } catch (err) {
      console.warn('MongoDB restoreCompanyPhone error:', err);
    }
  }

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
    saveAdminStoreLocal(store);
    toggleHiddenPhoneAsync(taxId, phone, reason).catch(() => {});
    return true;
  }
}

export async function toggleHiddenPhoneAsync(taxId: string, phone: string, reason: string = 'Ẩn thủ công từ trang quản trị Admin'): Promise<boolean> {
  const store = await getAdminStoreAsync();
  if (store.hiddenPhones[taxId]) {
    await restoreCompanyPhoneAsync(taxId);
    return true;
  } else {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const resolvedPhone = phone || getKnownPhone(taxId) || '02854155555';
    store.hiddenPhones[taxId] = {
      originalPhone: resolvedPhone,
      hiddenAt: now,
      reason,
    };
    saveAdminStoreLocal(store);

    if (isMongoConfigured()) {
      try {
        const db = await getDb();
        if (db) {
          await db.collection('hidden_phones').updateOne(
            { taxId },
            { $set: { taxId, originalPhone: resolvedPhone, hiddenAt: now, reason } },
            { upsert: true }
          );
        }
      } catch (err) {
        console.warn('MongoDB toggleHiddenPhone error:', err);
      }
    }
    return true;
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
  saveAdminStoreLocal(store);
  submitContactAsync(msg).catch(() => {});
  return { success: true, message: newMsg };
}

export async function submitContactAsync(msg: Omit<ContactMessage, 'id' | 'status' | 'createdAt'>): Promise<{ success: boolean; message: ContactMessage }> {
  const store = await getAdminStoreAsync();
  const id = `msg-${Date.now()}`;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const newMsg: ContactMessage = {
    ...msg,
    id,
    status: 'unread',
    createdAt: now,
  };

  store.contactMessages = [newMsg, ...store.contactMessages.filter(m => m.id !== id)];
  saveAdminStoreLocal(store);

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        await db.collection('contact_messages').insertOne({ ...newMsg });
      }
    } catch (err) {
      console.warn('MongoDB submitContact error:', err);
    }
  }

  return { success: true, message: newMsg };
}

export function updateContactStatus(msgId: string, status: 'unread' | 'read' | 'replied'): boolean {
  const store = getAdminStore();
  const msg = store.contactMessages.find((m) => m.id === msgId);
  if (!msg) return false;
  msg.status = status;
  saveAdminStoreLocal(store);
  updateContactStatusAsync(msgId, status).catch(() => {});
  return true;
}

export async function updateContactStatusAsync(msgId: string, status: 'unread' | 'read' | 'replied'): Promise<boolean> {
  const store = await getAdminStoreAsync();
  const msg = store.contactMessages.find((m) => m.id === msgId);
  if (msg) {
    msg.status = status;
  }
  saveAdminStoreLocal(store);

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        await db.collection('contact_messages').updateOne(
          { id: msgId },
          { $set: { status } }
        );
      }
    } catch (err) {
      console.warn('MongoDB updateContactStatus error:', err);
    }
  }

  return true;
}
