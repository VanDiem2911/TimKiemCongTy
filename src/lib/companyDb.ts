import { getDb, isMongoConfigured } from './mongodb';
import { BusinessTaxInfo } from '@/types/tax';
import { PROVINCES, normalizeTaxId, getCompanySlug } from './constants';

export interface MongoCompanyDoc {
  id: string;
  name: string;
  representative?: string;
  address?: string;
  province?: string;
  provinceSlug?: string;
  slug?: string;
  startDate?: string;
  registrationDate?: string;
  phone?: string;
  rawPhone?: string;
  status?: string;
  mainIndustry?: string;
  mainIndustryCode?: string;
  industryName?: string;
  industryCode?: string;
  managedBy?: string;
  internationalName?: string;
  shortName?: string;
  enterpriseType?: string;
  updatedAt?: Date;
}

/**
 * Deduce matching province slug from address or province name
 */
export function getProvinceSlugFromInfo(address?: string, provinceName?: string): string {
  const target = `${provinceName || ''} ${address || ''}`.toLowerCase();
  for (const prov of PROVINCES) {
    if (target.includes(prov.name.toLowerCase()) || target.includes(prov.slug.toLowerCase())) {
      return prov.slug;
    }
  }
  return 'ho-chi-minh-23';
}

/**
 * 1. Find company in MongoDB Atlas by Tax ID
 */
export async function findCompanyInDb(taxId: string): Promise<BusinessTaxInfo | null> {
  const cleanId = normalizeTaxId(taxId);
  if (!cleanId || !isMongoConfigured()) return null;

  try {
    const db = await getDb();
    if (!db) return null;

    const coll = db.collection<MongoCompanyDoc>('companies');
    // Try exact match first
    let doc = await coll.findOne({ id: cleanId });

    // If not found, try raw taxId or hyphenated / unhyphenated variants
    if (!doc && taxId !== cleanId) {
      doc = await coll.findOne({ id: taxId });
    }

    if (!doc) {
      // Check if it's 10 digits and has a 13 digit extension or vice-versa
      doc = await coll.findOne({ id: new RegExp(`^${cleanId}`) });
    }

    if (!doc || !doc.name) return null;

    const effectiveDate = doc.startDate || doc.registrationDate || '';
    const effectivePhone = doc.phone || doc.rawPhone;

    return {
      id: doc.id,
      name: doc.name,
      representative: doc.representative,
      address: doc.address || 'Việt Nam',
      province: doc.province,
      startDate: effectiveDate || undefined,
      registrationDate: effectiveDate || undefined,
      phone: effectivePhone,
      rawPhone: doc.rawPhone || doc.phone,
      status: doc.status || '',
      mainIndustry: doc.mainIndustry || doc.industryName,
      mainIndustryCode: doc.mainIndustryCode || doc.industryCode,
      industryName: doc.mainIndustry || doc.industryName || undefined,
      industryCode: doc.mainIndustryCode || doc.industryCode || undefined,
      managedBy: doc.managedBy,
      internationalName: doc.internationalName,
      shortName: doc.shortName,
      enterpriseType: doc.enterpriseType,
      contactInfo: {
        phone: effectivePhone || 'Chưa cập nhật',
        phoneStatus: effectivePhone ? 'available' : 'not_found',
        email: null,
        emailStatus: 'not_found',
        address: doc.address || '',
        website: null,
        hasWebsite: false,
        websiteStatus: 'not_found',
        aiScannedAt: '',
        aiScanSummary: '',
        verifiedByAi: false,
        sourcesChecked: ['MongoDB Atlas Enterprise Cloud']
      }
    };
  } catch (err) {
    console.warn('[companyDb] findCompanyInDb error:', err);
    return null;
  }
}

/**
 * Bỏ hết các trường rỗng trước khi ghi.
 * Trình điều khiển MongoDB mặc định ghi `undefined` thành `null`, nên nếu giữ
 * nguyên thì một bản ghi thưa tải về từ nguồn sẽ xóa mất số điện thoại / ngành
 * nghề đã có sẵn trong kho. Chỉ ghi đè bằng dữ liệu thật sự có giá trị.
 */
function stripEmptyFields<T extends Record<string, unknown>>(doc: T): T {
  for (const key of Object.keys(doc)) {
    const value = doc[key];
    if (value === undefined || value === null || value === '') {
      delete doc[key];
    }
  }
  return doc;
}

/**
 * 2. Save or Upsert single company to MongoDB Atlas
 */
export async function saveCompanyToDb(company: Partial<BusinessTaxInfo>): Promise<boolean> {
  if (!company.id || !company.name) return false;
  if (!isMongoConfigured()) return false;

  const cleanId = normalizeTaxId(company.id);

  try {
    const db = await getDb();
    if (!db) return false;

    const coll = db.collection<MongoCompanyDoc>('companies');
    const provSlug =
      (company as { provinceSlug?: string }).provinceSlug ||
      getProvinceSlugFromInfo(company.address, company.province);
    // Khong gan ngay hom nay khi chua biet ngay that - se hien thi sai ngay thanh lap
    const dateVal = company.startDate || company.registrationDate || '';

    const doc: Partial<MongoCompanyDoc> = {
      id: cleanId,
      name: company.name.trim(),
      representative: company.representative?.trim() || undefined,
      address: company.address?.trim() || '',
      province: company.province?.trim() || undefined,
      provinceSlug: provSlug,
      slug: getCompanySlug(cleanId, company.name),
      startDate: dateVal,
      registrationDate: dateVal,
      phone: company.phone && !company.phone.includes('ẩn') ? company.phone : (company.rawPhone || undefined),
      rawPhone: company.rawPhone || (company.phone && !company.phone.includes('ẩn') ? company.phone : undefined),
      status: company.status || '',
      mainIndustry: company.mainIndustry || company.industryName,
      mainIndustryCode: company.mainIndustryCode || company.industryCode,
      managedBy: company.managedBy || undefined,
      internationalName: company.internationalName || undefined,
      shortName: company.shortName || undefined,
      enterpriseType: company.enterpriseType || undefined,
      updatedAt: new Date()
    };

    await coll.updateOne(
      { id: cleanId },
      { $set: stripEmptyFields(doc) },
      { upsert: true }
    );

    console.log(`[companyDb] Đã lưu DN mới vào MongoDB Atlas: ${cleanId} - ${company.name}`);
    return true;
  } catch (err) {
    console.warn('[companyDb] saveCompanyToDb error:', err);
    return false;
  }
}

/**
 * 3. Batch save companies to MongoDB Atlas (bulkWrite)
 */
export async function saveCompaniesBatchToDb(companies: Partial<BusinessTaxInfo>[]): Promise<number> {
  if (!companies || companies.length === 0 || !isMongoConfigured()) return 0;

  try {
    const db = await getDb();
    if (!db) return 0;

    const coll = db.collection<MongoCompanyDoc>('companies');
    const valid = companies.filter(c => c.id && c.name);
    if (valid.length === 0) return 0;

    const ops = valid.map((comp) => {
      const cleanId = normalizeTaxId(comp.id!);
      const provSlug =
        (comp as { provinceSlug?: string }).provinceSlug ||
        getProvinceSlugFromInfo(comp.address, comp.province);
      const dateVal = comp.startDate || comp.registrationDate || '';

      const doc: Partial<MongoCompanyDoc> = {
        id: cleanId,
        name: comp.name!.trim(),
        representative: comp.representative?.trim() || undefined,
        address: comp.address?.trim() || '',
        province: comp.province?.trim() || undefined,
        provinceSlug: provSlug,
        slug: getCompanySlug(cleanId, comp.name!),
        startDate: dateVal,
        registrationDate: dateVal,
        phone: comp.phone && !comp.phone.includes('ẩn') ? comp.phone : (comp.rawPhone || undefined),
        rawPhone: comp.rawPhone || (comp.phone && !comp.phone.includes('ẩn') ? comp.phone : undefined),
        status: comp.status || '',
        mainIndustry: comp.mainIndustry || comp.industryName,
        mainIndustryCode: comp.mainIndustryCode || comp.industryCode,
        managedBy: comp.managedBy,
        updatedAt: new Date()
      };

      return {
        updateOne: {
          filter: { id: cleanId },
          update: { $set: stripEmptyFields(doc) },
          upsert: true
        }
      };
    });

    const result = await coll.bulkWrite(ops, { ordered: false });
    return (result.upsertedCount || 0) + (result.modifiedCount || 0);
  } catch (err) {
    console.warn('[companyDb] saveCompaniesBatchToDb error:', err);
    return 0;
  }
}

/**
 * Tìm doanh nghiệp ngay trong kho MongoDB của chính mình.
 * Endpoint tìm kiếm của trang nguồn thường trả về 403, nên đây là nguồn
 * kết quả chính chứ không phải phương án chữa cháy.
 */
export async function searchCompaniesInDb(
  keyword: string,
  type: string = 'auto',
  limit: number = 40
): Promise<BusinessTaxInfo[]> {
  const q = (keyword || '').trim();
  if (!q || !isMongoConfigured()) return [];

  try {
    const db = await getDb();
    if (!db) return [];

    // Thoát các ký tự đặc biệt để người dùng gõ gì cũng không làm hỏng biểu thức
    const ESCAPE_CHAR = String.fromCharCode(92);
    const SPECIAL = new Set([
      '.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', ESCAPE_CHAR,
    ]);
    const safe = Array.from(q)
      .map((ch) => (SPECIAL.has(ch) ? ESCAPE_CHAR + ch : ch))
      .join('');
    const rx = new RegExp(safe, 'i');
    const digits = q.replace(/[^0-9]/g, '');

    let filter: Record<string, unknown>;
    if (type === 'companyName') {
      filter = { name: rx };
    } else if (type === 'legalName') {
      filter = { representative: rx };
    } else if (type === 'enterpriseTax' || type === 'taxCode') {
      filter = digits ? { id: new RegExp(digits) } : { id: rx };
    } else {
      const or: Record<string, unknown>[] = [{ name: rx }, { representative: rx }];
      if (digits.length >= 4) or.push({ id: new RegExp(digits) });
      filter = { $or: or };
    }

    const docs = await db
      .collection<MongoCompanyDoc>('companies')
      .find(filter)
      .limit(limit)
      .toArray();

    return docs
      .filter((doc) => doc.id && doc.name)
      .map((doc) => {
        const date = doc.startDate || doc.registrationDate || '';
        const phone = doc.phone || doc.rawPhone;
        return {
          id: doc.id,
          name: doc.name,
          representative: doc.representative,
          address: doc.address || '',
          province: doc.province,
          startDate: date || undefined,
          registrationDate: date || undefined,
          phone: phone || undefined,
          rawPhone: doc.rawPhone || doc.phone,
          status: doc.status || '',
          industryName: doc.mainIndustry || doc.industryName || undefined,
          industryCode: doc.mainIndustryCode || doc.industryCode || undefined,
          managedBy: doc.managedBy || undefined,
          internationalName: doc.internationalName,
          shortName: doc.shortName,
          enterpriseType: doc.enterpriseType,
        } as BusinessTaxInfo;
      });
  } catch (err) {
    console.warn('[companyDb] searchCompaniesInDb error:', err);
    return [];
  }
}

/**
 * Tra ngày thành lập và trạng thái của nhiều doanh nghiệp cùng lúc theo mã số thuế.
 * Dùng để bổ sung cho danh sách lấy từ trang nguồn, vì trang nguồn không kèm
 * hai thông tin này trong kết quả liệt kê.
 */
export interface CompanyFacts {
  startDate?: string;
  status?: string;
}

export async function getCompanyFactsByIds(ids: string[]): Promise<Map<string, CompanyFacts>> {
  const result = new Map<string, CompanyFacts>();
  if (!ids.length || !isMongoConfigured()) return result;

  try {
    const db = await getDb();
    if (!db) return result;

    const lookupIds = new Set<string>();
    for (const id of ids) {
      if (!id) continue;
      lookupIds.add(id);
      lookupIds.add(normalizeTaxId(id));
    }

    const docs = await db
      .collection<MongoCompanyDoc>('companies')
      .find(
        { id: { $in: Array.from(lookupIds) } },
        { projection: { id: 1, startDate: 1, status: 1, _id: 0 } }
      )
      .toArray();

    for (const doc of docs) {
      if (!doc.id) continue;
      const facts: CompanyFacts = {};
      if (typeof doc.startDate === 'string' && doc.startDate) facts.startDate = doc.startDate;
      if (typeof doc.status === 'string' && doc.status) facts.status = doc.status;
      if (facts.startDate || facts.status) result.set(doc.id, facts);
    }
  } catch (err) {
    console.warn('[companyDb] getCompanyFactsByIds error:', err);
  }

  return result;
}

/**
 * 4. Get companies for a specific province from MongoDB Atlas
 * Sắp xếp theo ngày thành lập mới nhất giảm dần: { startDate: -1, registrationDate: -1, _id: -1 }
 */
export async function getCompaniesByProvinceFromDb(
  provinceSlug: string,
  page: number = 1,
  pageSize: number = 25
): Promise<{ companies: BusinessTaxInfo[]; total: number; totalPages: number } | null> {
  if (!isMongoConfigured()) return null;

  try {
    const db = await getDb();
    if (!db) return null;

    const coll = db.collection<MongoCompanyDoc>('companies');
    const norm = provinceSlug.toLowerCase().trim();

    const matchedProv = PROVINCES.find(p =>
      norm === p.slug.toLowerCase() ||
      norm.includes(p.slug.toLowerCase()) ||
      norm.includes(p.name.toLowerCase()) ||
      p.slug.toLowerCase().includes(norm) ||
      p.name.toLowerCase().includes(norm)
    );

    const targetSlug = matchedProv ? matchedProv.slug : provinceSlug;
    const targetName = matchedProv ? matchedProv.name : provinceSlug;

    // Remove suffix number if any (e.g. ho-chi-minh-23 -> ho-chi-minh)
    const baseSlug = targetSlug.replace(/-\d+$/, '');

    const filter: Record<string, unknown> = {
      $or: [
        { provinceSlug: targetSlug },
        { provinceSlug: baseSlug },
        { provinceSlug: new RegExp(`^${baseSlug}`) },
        { province: new RegExp(targetName.replace(/(thành phố|tỉnh)\s*/i, '').trim(), 'i') },
        { address: new RegExp(targetName.replace(/(thành phố|tỉnh)\s*/i, '').trim(), 'i') }
      ]
    };

    const total = await coll.countDocuments(filter);
    if (total === 0) return null;

    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * pageSize;

    // Sắp xếp ngày thành lập MỚI NHẤT lên đầu tiên
    const docs = await coll
      .find(filter)
      .sort({ startDate: -1, registrationDate: -1, _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    const companies: BusinessTaxInfo[] = docs.map((doc) => {
      const effDate = doc.startDate || doc.registrationDate || '';
      const effPhone = doc.phone || doc.rawPhone;
      return {
        id: doc.id,
        name: doc.name,
        representative: doc.representative,
        address: doc.address || '',
        province: doc.province || targetName,
        startDate: effDate || undefined,
        registrationDate: effDate || undefined,
        phone: effPhone,
        rawPhone: doc.rawPhone || doc.phone,
        status: doc.status || '',
        industryName: doc.mainIndustry || doc.industryName || undefined,
        industryCode: doc.mainIndustryCode || doc.industryCode || undefined,
        managedBy: doc.managedBy || undefined,
      };
    });

    return {
      companies,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  } catch (err) {
    console.warn('[companyDb] getCompaniesByProvinceFromDb error:', err);
    return null;
  }
}
