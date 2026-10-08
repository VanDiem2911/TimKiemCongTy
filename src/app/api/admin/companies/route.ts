import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_COMPANIES, PROVINCES, normalizeTaxId } from '@/lib/constants';
import { getCompaniesByProvince } from '@/lib/provinceCompanies';
import { BusinessTaxInfo } from '@/types/tax';
import harvestedJson from '@/data/harvested_provinces.json';

interface HarvestedAdminItem {
  id: string;
  name: string;
  representative?: string;
  address: string;
  slug?: string;
  status?: string;
  startDate?: string;
  phone?: string | null;
  mainIndustry?: string;
  managedBy?: string;
}

// Danh sách doanh nghiệp dựng sẵn, dùng lại giữa các lượt gọi API
let ALL_COMPANIES_CACHE: BusinessTaxInfo[] | null = null;

const HARVESTED_DATA = harvestedJson as unknown as Record<string, HarvestedAdminItem[]>;

const KNOWN_WEBSITES: Record<string, string> = {
  '0319641544': 'https://www.dudisoftware.com',
  '0300588569': 'https://www.vinamilk.com.vn',
  '0101248141': 'https://fpt.com',
  '0100109106': 'https://viettel.com.vn',
  '0100112437': 'https://www.vietcombank.com.vn',
  '0100150619': 'https://pvn.vn',
  '3502593768': 'https://vinaonesteel.com',
};

function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}




export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const province = searchParams.get('province') || 'all';
    const website = searchParams.get('website') || 'all';
    const phone = searchParams.get('phone') || 'all';
    const taxId = searchParams.get('taxId')?.trim() || '';
    const timeType = searchParams.get('timeType') || 'all';
    const startDate = searchParams.get('startDate') ? parseDateToISO(searchParams.get('startDate')!) : '';
    const endDate = searchParams.get('endDate') ? parseDateToISO(searchParams.get('endDate')!) : '';
    const beforeDate = searchParams.get('beforeDate') ? parseDateToISO(searchParams.get('beforeDate')!) : '';
    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';
    const limit = Math.min(20000, Math.max(10, parseInt(searchParams.get('limit') || '10000', 10)));
    const query = searchParams.get('q')?.toLowerCase().trim() || '';

    // Lọc theo điều kiện người dùng chọn rồi trả kết quả.
    const filterAndRespond = (allList: BusinessTaxInfo[]) => {
      let targetProvNormalized = '';
      if (province && province !== 'all') {
        const pObj = PROVINCES.find(
          (p) => p.slug === province || normalize(p.name) === normalize(province)
        );
        targetProvNormalized = pObj
          ? normalize(pObj.name)
          : normalize(province.replace(/-\d+$/, ''));
      }

      const normQ = query ? normalize(query) : '';
      const cleanTaxId = taxId ? taxId.replace(/[^0-9a-zA-Z]/g, '').toLowerCase() : '';

      const filtered = allList.filter((company) => {
        // 0. Điều kiện Mã số thuế (MST)
        if (cleanTaxId) {
          const compTaxId = (company.id || '').replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
          if (!compTaxId.includes(cleanTaxId)) return false;
        }

        // 1. Điều kiện Tỉnh / Thành phố
        if (targetProvNormalized) {
          const cProv = normalize(company.province || '');
          const cAddr = normalize(company.address || '');
          if (!cProv.includes(targetProvNormalized) && !cAddr.includes(targetProvNormalized)) {
            return false;
          }
        }

        // 2. Điều kiện Trạng thái Website
        const hasWeb = Boolean(company.contactInfo?.website || company.contactInfo?.hasWebsite);
        if (website === 'hasWebsite' && !hasWeb) return false;
        if (website === 'noWebsite' && hasWeb) return false;

        // 2b. Điều kiện Số điện thoại (Có SĐT / Chưa có SĐT)
        const rawPhone = company.phone || company.contactInfo?.phone;
        const hasRealPhone = Boolean(
          rawPhone &&
          typeof rawPhone === 'string' &&
          rawPhone.trim() &&
          rawPhone !== 'Bị ẩn theo yêu cầu người dùng' &&
          rawPhone !== 'Chưa có' &&
          /\d/.test(rawPhone)
        );
        if (phone === 'hasPhone' && !hasRealPhone) return false;
        if (phone === 'noPhone' && hasRealPhone) return false;

        // 3. Điều kiện Thời gian thành lập
        const compDate = company.startDate || company.registrationDate || '';

        if (timeType === 'before' || (beforeDate && timeType === 'all')) {
          const target = beforeDate || startDate;
          if (target && compDate && compDate >= target) return false;
        } else if (timeType === 'after') {
          const target = endDate || startDate;
          if (target && compDate && compDate <= target) return false;
        } else if (timeType === 'exact_date') {
          if (startDate && compDate !== startDate) return false;
        } else if (timeType === 'range') {
          if (startDate && compDate && compDate < startDate) return false;
          if (endDate && compDate && compDate > endDate) return false;
        } else if (timeType === 'month') {
          const m = month.trim();
          if (m && !compDate.startsWith(m)) return false;
        } else if (timeType === 'year') {
          const y = year.trim();
          if (y && !compDate.startsWith(y)) return false;
        }

        // 4. Tìm kiếm từ khóa nếu có
        if (normQ) {
          const matchName = normalize(company.name).includes(normQ);
          const matchId = company.id.includes(query);
          const matchRep = normalize(company.representative || '').includes(normQ);
          if (!matchName && !matchId && !matchRep) return false;
        }

        return true;
      });

      return NextResponse.json({
        success: true,
        data: filtered.slice(0, limit),
        total: filtered.length,
        filters: { taxId, province, website, phone, timeType, startDate, endDate, month, year },
      });
    };

    // 1. Tập hợp danh sách công ty ban đầu (100% trong bộ nhớ, tốc độ tức thời)
    // Dữ liệu nguồn là tĩnh nên chỉ dựng một lần rồi dùng lại cho mọi lượt lọc.
    if (ALL_COMPANIES_CACHE) {
      return filterAndRespond(ALL_COMPANIES_CACHE);
    }

    const allCompaniesMap = new Map<string, BusinessTaxInfo>();

    // A. Danh sách doanh nghiệp mẫu chất lượng cao
    INITIAL_COMPANIES.forEach((c) => {
      const site = KNOWN_WEBSITES[c.id] || null;
      allCompaniesMap.set(c.id, {
        ...c,
        phone: c.phone || undefined,
        startDate: c.startDate || c.registrationDate || undefined,
        contactInfo: {
          phone: c.phone || '',
          phoneStatus: 'available',
          email: null,
          emailStatus: 'not_found',
          address: c.address,
          website: site,
          hasWebsite: Boolean(site),
          websiteStatus: site ? 'found' : 'not_found',
          aiScannedAt: '',
          aiScanSummary: site ? `Website chính thức: ${site}` : 'Chưa có website',
          verifiedByAi: false,
          sourcesChecked: ['Hệ thống CSDL'],
        },
      });
    });

    // B. Thêm các doanh nghiệp đã thu thập (750+ doanh nghiệp thực)
    for (const [slug, list] of Object.entries(HARVESTED_DATA)) {
      const provObj = PROVINCES.find((p) => p.slug === slug);
      const provName = provObj ? provObj.name : slug;

      for (const item of list) {
        const normalizedId = normalizeTaxId(item.id);
        if (!allCompaniesMap.has(normalizedId)) {
          const site = KNOWN_WEBSITES[item.id] || KNOWN_WEBSITES[normalizedId] || null;
          const realDate = item.startDate ? parseDateToISO(item.startDate) : '';
          const realPhone = item.phone && item.phone !== 'Bị ẩn theo yêu cầu người dùng' ? item.phone : (item.phone || null);

          allCompaniesMap.set(normalizedId, {
            id: normalizedId,
            name: item.name,
            representative: item.representative || undefined,
            address: item.address,
            province: provName,
            status: item.status || 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
            startDate: realDate || undefined,
            registrationDate: realDate || undefined,
            phone: realPhone || undefined,
            industryName: item.mainIndustry || undefined,
            managedBy: item.managedBy || undefined,
            contactInfo: {
              phone: realPhone || '',
              phoneStatus: realPhone ? 'available' : 'not_found',
              email: null,
              emailStatus: 'not_found',
              address: item.address,
              website: site,
              hasWebsite: Boolean(site),
              websiteStatus: site ? 'found' : 'not_found',
              aiScannedAt: '',
              aiScanSummary: site ? `Website: ${site}` : (realPhone ? `SĐT: ${realPhone}` : 'Dữ liệu xác thực từ CSDL'),
              verifiedByAi: false,
              sourcesChecked: ['Hồ sơ đăng ký kinh doanh'],
            },
          });
        }
      }
    }

    ALL_COMPANIES_CACHE = Array.from(allCompaniesMap.values());
    return filterAndRespond(ALL_COMPANIES_CACHE);

  } catch (error) {
    console.error('Lỗi API /api/admin/companies:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lọc danh sách doanh nghiệp' },
      { status: 500 }
    );
  }
}
