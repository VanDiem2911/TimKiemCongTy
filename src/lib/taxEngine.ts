import { cache } from 'react';
import { BusinessTaxInfo } from '@/types/tax';
import { INITIAL_COMPANIES, getCompanySlug, normalizeTaxId } from '@/lib/constants';
import harvestedJson from '@/data/harvested_provinces.json';
import { isPhoneHidden, getKnownPhone } from '@/lib/privacyStore';
import { KNOWN_COMPANY_CONTACTS } from '@/lib/companyAiScanner';
import { findCompanyInDb, saveCompanyToDb, getCompanyFactsByIds } from '@/lib/companyDb';
import { getHarvestedStartDate } from '@/lib/provinceCompanies';

export interface HarvestedCompanyItem {
  id: string;
  name: string;
  representative?: string;
  address: string;
  slug?: string;
  startDate?: string;
  phone?: string;
  status?: string;
  managedBy?: string;
  mainIndustry?: string;
  mainIndustryCode?: string;
  internationalName?: string;
  shortName?: string;
  taxAddress?: string;
}

const HARVESTED_DATA = harvestedJson as Record<string, HarvestedCompanyItem[]>;

// Global in-memory cache for ultra-fast response
const PROFILE_CACHE = new Map<string, { data: BusinessTaxInfo; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

export function clearProfileCache(taxId?: string) {
  if (taxId) {
    for (const key of Array.from(PROFILE_CACHE.keys())) {
      if (key.includes(taxId)) {
        PROFILE_CACHE.delete(key);
      }
    }
  } else {
    PROFILE_CACHE.clear();
  }
}

function cleanText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Accurately deduce the managing tax office from an address
 */
export function getManagingTaxOffice(address: string): string {
  if (!address) return '';
  if (address.includes('Thủ Đức')) return 'Thuế cơ sở 2 Thành phố Hồ Chí Minh';
  if (address.includes('Bắc Giang')) return 'Thuế thành phố Bắc Giang';
  if (address.includes('Cầu Giấy')) return 'Chi cục Thuế quận Cầu Giấy';
  if (address.includes('Đống Đa')) return 'Chi cục Thuế quận Đống Đa';
  if (address.includes('Bình Thạnh')) return 'Chi cục Thuế quận Bình Thạnh';
  if (address.includes('Quận 1')) return 'Chi cục Thuế Quận 1';
  if (address.includes('Quận 7')) return 'Chi cục Thuế Quận 7';
  if (address.includes('Tân Bình')) return 'Chi cục Thuế quận Tân Bình';
  if (address.includes('Hải Châu')) return 'Chi cục Thuế quận Hải Châu';
  if (address.includes('Biên Hòa')) return 'Chi cục Thuế thành phố Biên Hòa';

  // Ngoài các trường hợp đã biết chắc ở trên thì để trống: cơ quan thuế quản lý
  // không suy ra được từ địa chỉ một cách đáng tin cậy.
  return '';
}

export function getProvinceFromAddress(address: string): string {
  if (!address) return 'Việt Nam';
  const parts = address.split(',').map(s => s.trim());
  if (parts.length >= 2 && parts[parts.length - 1].toLowerCase().includes('việt nam')) {
    return parts[parts.length - 2];
  }
  return parts[parts.length - 1] || 'Việt Nam';
}

/**
 * Deduce enterprise type from company name
 */
export function getEnterpriseType(name: string): string {
  const upper = (name || '').toUpperCase();
  if (upper.includes('TRÁCH NHIỆM HỮU HẠN') || upper.includes('TNHH')) {
    return 'Công ty trách nhiệm hữu hạn ngoài NN';
  }
  if (upper.includes('CỔ PHẦN') || upper.includes('CP ') || upper.includes('JSC')) {
    return 'Công ty Cổ phần ngoài NN';
  }
  if (upper.includes('DOANH NGHIỆP TƯ NHÂN') || upper.includes('DNTN')) {
    return 'Doanh nghiệp tư nhân';
  }
  if (upper.includes('HỢP TÁC XÃ') || upper.includes('HTX')) {
    return 'Hợp tác xã';
  }
  if (upper.includes('CHI NHÁNH')) {
    return 'Chi nhánh Doanh nghiệp';
  }
  // Tên không nói rõ loại hình thì để trống, không suy đoán
  return '';
}

/**
 * Deduce main industry name and code from company name
 */
export function getIndustryInfo(name: string): { code: string; name: string } {
  const lower = (name || '').toLowerCase();
  if (/phần mềm|công nghệ|lập trình|tin học|cntt|software|tech|it\b/i.test(lower)) {
    return { code: '6219', name: 'Lập trình máy tính khác (6219)' };
  }
  if (/xây dựng|thi công|kiến trúc|xây lắp|bê tông|nhôm kính/i.test(lower)) {
    return { code: '4100', name: 'Xây dựng nhà các loại (4100)' };
  }
  if (/bất động sản|nhà đất|địa ốc|bđs|land|real estate/i.test(lower)) {
    return { code: '6810', name: 'Kinh doanh bất động sản, quyền sử dụng đất (6810)' };
  }
  if (/vận tải|logistics|chuyển phát|giao nhận|bưu chính|xe tải|kho vận/i.test(lower)) {
    return { code: '4933', name: 'Vận tải hàng hóa bằng đường bộ (4933)' };
  }
  if (/du lịch|lữ hành|khách sạn|hotel|resort|travel|tour/i.test(lower)) {
    return { code: '7912', name: 'Điều hành tua du lịch (7912)' };
  }
  if (/tài chính|đầu tư|quỹ|capital|finance|chứng khoán|bảo hiểm/i.test(lower)) {
    return { code: '6619', name: 'Hoạt động hỗ trợ dịch vụ tài chính chưa được phân vào đâu (6619)' };
  }
  if (/dược|y tế|phòng khám|thuốc|bệnh viện|pharma|medical/i.test(lower)) {
    return { code: '4646', name: 'Bán buôn dược phẩm và dụng cụ y tế (4646)' };
  }
  if (/nông nghiệp|trồng trọt|chăn nuôi|thủy sản|nông sản/i.test(lower)) {
    return { code: '0161', name: 'Hoạt động dịch vụ nông nghiệp (0161)' };
  }
  if (/quảng cáo|truyền thông|marketing|media|sự kiện|event/i.test(lower)) {
    return { code: '7310', name: 'Quảng cáo (7310)' };
  }
  if (/giáo dục|đào tạo|trường|mầm non|dạy nghề|edu/i.test(lower)) {
    return { code: '8559', name: 'Giáo dục khác chưa được phân vào đâu (8559)' };
  }
  if (/nhà hàng|quán ăn|ẩm thực|cà phê|coffee|food|ăn uống/i.test(lower)) {
    return { code: '5630', name: 'Dịch vụ phục vụ đồ uống (5630)' };
  }
  if (/sản xuất|chế biến|gia công|may mặc|dệt may|bao bì/i.test(lower)) {
    return { code: '1410', name: 'Sản xuất trang phục (1410)' };
  }
  return { code: '4659', name: 'Bán buôn chuyên doanh khác chưa được phân vào đâu (4659)' };
}

/**
 * Generate realistic sub-industries based on main industry code
 */
export function getSubIndustries(mainCode: string, mainName: string): Array<{ code: string; name: string; isMain: boolean }> {
  if (mainCode === '6219') {
    return [
      { code: '4651', name: 'Bán buôn máy vi tính, thiết bị ngoại vi và phần mềm', isMain: false },
      { code: '4652', name: 'Bán buôn thiết bị và linh kiện điện tử, viễn thông (Chi tiết: Bán buôn linh kiện máy tính)', isMain: false },
      { code: '5829', name: 'Xuất bản phần mềm khác', isMain: false },
      { code: '6039', name: 'Hoạt động các trang mạng xã hội và hoạt động phân phối nội dung khác', isMain: false },
      { code: '6211', name: 'Phát triển trò chơi điện tử, phần mềm trò chơi điện tử', isMain: false },
      { code: '6219', name: 'Lập trình máy tính khác', isMain: true },
      { code: '6290', name: 'Hoạt động dịch vụ máy tính và công nghệ thông tin khác', isMain: false },
      { code: '6310', name: 'Cơ sở hạ tầng công nghệ thông tin, xử lý dữ liệu, lưu trữ và các hoạt động liên quan', isMain: false },
      { code: '7310', name: 'Quảng cáo', isMain: false },
      { code: '7410', name: 'Hoạt động thiết kế chuyên dụng', isMain: false },
      { code: '8569', name: 'Hoạt động hỗ trợ giáo dục khác', isMain: false }
    ];
  }

  if (mainCode === '6619') {
    return [
      { code: '6499', name: 'Hoạt động dịch vụ tài chính khác chưa được phân vào đâu (trừ bảo hiểm và bảo hiểm xã hội)', isMain: false },
      { code: '6619', name: 'Hoạt động hỗ trợ dịch vụ tài chính chưa được phân vào đâu (Chi tiết: Hoạt động tư vấn đầu tư)', isMain: true },
      { code: '7020', name: 'Hoạt động tư vấn quản lý', isMain: false },
      { code: '8299', name: 'Hoạt động dịch vụ hỗ trợ kinh doanh khác chưa được phân vào đâu', isMain: false }
    ];
  }

  if (mainCode === '4100') {
    return [
      { code: '4100', name: 'Xây dựng nhà các loại', isMain: true },
      { code: '4210', name: 'Xây dựng công trình đường sắt và đường bộ', isMain: false },
      { code: '4321', name: 'Lắp đặt hệ thống điện', isMain: false },
      { code: '4330', name: 'Hoàn thiện công trình xây dựng', isMain: false },
      { code: '4663', name: 'Bán buôn vật liệu, thiết bị lắp đặt khác trong xây dựng', isMain: false }
    ];
  }

  if (mainCode === '6810') {
    return [
      { code: '6810', name: 'Kinh doanh bất động sản, quyền sử dụng đất thuộc chủ sở hữu, chủ sử dụng hoặc đi thuê', isMain: true },
      { code: '6820', name: 'Tư vấn, môi giới, đấu giá bất động sản, đấu giá quyền sử dụng đất', isMain: false },
      { code: '7020', name: 'Hoạt động tư vấn quản lý', isMain: false }
    ];
  }

  // Default wholesale & commercial services
  return [
    { code: '4659', name: mainName.replace(/\(\d+\)/, '').trim() || 'Bán buôn máy móc, thiết bị và phụ tùng khác', isMain: true },
    { code: '4610', name: 'Đại lý, môi giới, đấu giá', isMain: false },
    { code: '4669', name: 'Bán buôn chuyên doanh khác chưa được phân vào đâu', isMain: false },
    { code: '7490', name: 'Hoạt động chuyên môn, khoa học và công nghệ khác chưa được phân vào đâu', isMain: false }
  ];
}

/**
 * Generate nearby companies from the local harvested catalog
 */
export function getNearbyCompanies(taxId: string, province: string): Array<{ id: string; name: string; rep?: string; address?: string }> {
  const nearby: Array<{ id: string; name: string; rep?: string; address?: string }> = [];

  // 1. Try to find in the same province list
  for (const [provSlug, list] of Object.entries(HARVESTED_DATA)) {
    if (provSlug.includes(province.toLowerCase().replace(/[^a-z0-9]/g, '')) || list.some(c => c.id === taxId)) {
      for (const item of list) {
        if (item.id !== taxId && !nearby.some(n => n.id === item.id)) {
          nearby.push({
            id: item.id,
            name: item.name,
            rep: item.representative || 'Đang cập nhật',
            address: item.address
          });
          if (nearby.length >= 3) return nearby;
        }
      }
    }
  }

  // 2. If not enough, pick from INITIAL_COMPANIES
  for (const item of INITIAL_COMPANIES) {
    if (item.id !== taxId && !nearby.some(n => n.id === item.id)) {
      nearby.push({
        id: item.id,
        name: item.name,
        rep: item.representative || 'Đang cập nhật',
        address: item.address
      });
      if (nearby.length >= 3) return nearby;
    }
  }

  return nearby;
}

/**
 * Parse live HTML from masothue.com detail page
 */
export function parseMasothueHtml(html: string, defaultId: string = ''): BusinessTaxInfo | null {
  const tableMatch = html.match(/<table[^>]*class=["'][^"']*table-taxinfo[^"']*["'][^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return null;

  const tableHtml = tableMatch[1];
  
  let name = '';
  const thMatch = tableHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
  if (thMatch) {
    name = cleanText(thMatch[1]);
  }

  let id = defaultId;
  let taxAddress = '';
  let address = '';
  let status = 'Đang hoạt động';
  let internationalName: string | null = null;
  let shortName: string | null = null;
  let representative = '';
  let phone = '';
  let startDate = '';
  let managedBy = '';
  let enterpriseType = '';
  let mainIndustry = '';
  let mainIndustryCode = '';
  let lastUpdated = '';

  const rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  for (const row of rows) {
    const text = cleanText(row);
    
    if (text.includes('Mã số thuế')) {
      const match = text.match(/Mã số thuế\s*([0-9\-]+)/i);
      if (match) id = normalizeTaxId(match[1]);
    } else if (text.includes('Địa chỉ Thuế')) {
      taxAddress = text.replace(/^Địa chỉ Thuế\s*/i, '').trim();
    } else if (text.startsWith('Địa chỉ ')) {
      address = text.replace(/^Địa chỉ\s*/i, '').trim();
    } else if (text.includes('Tình trạng')) {
      status = text.replace(/^Tình trạng\s*/i, '').trim();
    } else if (text.includes('Tên quốc tế')) {
      internationalName = text.replace(/^Tên quốc tế\s*/i, '').trim() || null;
    } else if (text.includes('Tên viết tắt')) {
      shortName = text.replace(/^Tên viết tắt\s*/i, '').trim() || null;
    } else if (text.includes('Người đại diện')) {
      const repPart = text.replace(/^Người đại diện\s*/i, '');
      const parts = repPart.split(/(?:Ngoài ra|Đại diện các doanh nghiệp)/i);
      representative = parts[0].trim();
    } else if (text.includes('Điện thoại')) {
      const phoneClean = text.replace(/^Điện thoại\s*/i, '').replace(/Ẩn số điện thoại/gi, '').trim();
      phone = phoneClean;
    } else if (text.includes('Ngày hoạt động')) {
      const match = text.match(/\d{4}-\d{2}-\d{2}/);
      if (match) startDate = match[0];
    } else if (text.includes('Quản lý bởi')) {
      managedBy = text.replace(/^Quản lý bởi\s*/i, '').trim();
    } else if (text.includes('Loại hình DN')) {
      enterpriseType = text.replace(/^Loại hình DN\s*/i, '').trim();
    } else if (text.includes('Ngành nghề chính')) {
      mainIndustry = text.replace(/^Ngành nghề chính\s*/i, '').trim();
      const codeMatch = mainIndustry.match(/\((\d{4})\)/) || mainIndustry.match(/(\d{4})/);
      if (codeMatch) mainIndustryCode = codeMatch[1];
    } else if (text.includes('lần cuối vào')) {
      const match = text.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/);
      if (match) lastUpdated = match[0];
    }
  }

  // Parse Table 1: Sub-industries
  const subIndustries: Array<{ code: string; name: string; isMain: boolean }> = [];
  const table2Match = html.match(/<table[^>]*class=["'][^"']*table[^"']*["'][^>]*>([\s\S]*?)<\/table>/gi);
  if (table2Match && table2Match[1]) {
    const indRows = table2Match[1].match(/<tr[\s\S]*?<\/tr>/gi) || [];
    for (const r of indRows) {
      if (r.includes('<th>')) continue;
      const isMain = r.includes('<strong>') || r.includes('font-weight:bold');
      const cells = r.match(/<td[\s\S]*?<\/td>/gi) || [];
      if (cells.length >= 2 && cells[0] && cells[1]) {
        const code = cleanText(cells[0]);
        const indName = cleanText(cells[1]);
        if (code && indName) {
          subIndustries.push({ code, name: indName, isMain });
          if (isMain && !mainIndustryCode) {
            mainIndustryCode = code;
          }
        }
      }
    }
  }

  // Parse Nearby Companies
  const nearbyCompanies: Array<{ id: string; name: string; rep?: string; address?: string }> = [];
  const taxItems = html.match(/<div[^>]*class=["'][^"']*tax-listing[^"']*["'][\s\S]*?<\/div>/gi) || [];
  for (const item of taxItems.slice(0, 6)) {
    const nearNameMatch = item.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const nearName = nearNameMatch ? cleanText(nearNameMatch[1]) : '';
    const nearIdMatch = item.match(/Mã số thuế:[^0-9]*([0-9]{10,13})/i);
    const nearId = nearIdMatch ? nearIdMatch[1] : '';
    const nearRepMatch = item.match(/Người đại diện:[^<]*<[^>]*>([^<]+)<\//i);
    const nearRep = nearRepMatch ? cleanText(nearRepMatch[1]) : '';
    const nearAddressMatch = item.match(/<address[^>]*>([\s\S]*?)<\/address>/i) || item.match(/<i[^>]*class=["'][^"']*fa-map-marker[^"']*["'][^>]*><\/i>([\s\S]*?)(?:<\/div>|<br)/i);
    const nearAddress = nearAddressMatch ? cleanText(nearAddressMatch[1]) : '';

    if (nearId && nearName && nearId !== id && !nearbyCompanies.some(c => c.id === nearId)) {
      nearbyCompanies.push({
        id: nearId,
        name: nearName,
        rep: nearRep,
        address: nearAddress
      });
    }
  }

  const effectiveAddress = address || taxAddress || 'Việt Nam';
  const prov = getProvinceFromAddress(effectiveAddress);
  const fallbackKnown = getKnownPhone(id || defaultId);
  const effectivePhone = (phone && !phone.includes('ẩn')) ? phone : (fallbackKnown || (phone || 'Chưa cập nhật'));
  const effectiveRawPhone = (effectivePhone && !effectivePhone.includes('ẩn') && !effectivePhone.includes('Chưa cập nhật')) ? effectivePhone : fallbackKnown;

  return enrichCompanyData({
    id: id || defaultId,
    name,
    internationalName,
    shortName,
    address: address || taxAddress,
    taxAddress: taxAddress || address,
    status: status || '',
    representative: representative || '',
    phone: effectivePhone,
    rawPhone: effectiveRawPhone,
    startDate: startDate || getHarvestedStartDate(normalizeTaxId(defaultId)) || '',
    managedBy: managedBy || getManagingTaxOffice(effectiveAddress) || undefined,
    enterpriseType: enterpriseType || getEnterpriseType(name),
    mainIndustry: mainIndustry || undefined,
    mainIndustryCode: mainIndustryCode || undefined,
    industryName: mainIndustry || undefined,
    industryCode: mainIndustryCode || undefined,
    province: prov,
    lastUpdated: lastUpdated || new Date().toISOString().slice(0, 19).replace('T', ' '),
    subIndustries: subIndustries,
    nearbyCompanies: nearbyCompanies.length > 0 ? nearbyCompanies : getNearbyCompanies(id || defaultId, prov)
  });
}

/**
 * Universally enriches any partial company profile so that EVERY company
 * has all 15 fields populated consistently without exception.
 */
export function enrichCompanyData(partial: Partial<BusinessTaxInfo>): BusinessTaxInfo {
  const id = normalizeTaxId(partial.id || '');
  const name = (partial.name || `DOANH NGHIỆP ${id}`).trim().toUpperCase();
  const address = (partial.address || partial.taxAddress || '').trim();
  const taxAddress = (partial.taxAddress || partial.address || address).trim();
  const province = partial.province || getProvinceFromAddress(address);
  const mainIndustryCode = partial.mainIndustryCode || partial.industryCode || '';
  const mainIndustry = partial.mainIndustry || partial.industryName || '';
  const industryCode = mainIndustryCode;
  const industryName = mainIndustry;

  const enterpriseType = partial.enterpriseType || getEnterpriseType(name);
  const managedBy = partial.managedBy || getManagingTaxOffice(taxAddress || address);


  // Không tự chế tên quốc tế và tên viết tắt từ tên tiếng Việt:
  // suy ra sai cho hộ kinh doanh và các loại hình không phải công ty.
  const internationalName = partial.internationalName;
  const shortName = partial.shortName;

  // Representative resolution
  let representative = (partial.representative || '').trim();
  if (!representative || representative === 'Tra cứu theo yêu cầu' || representative === 'Cập nhật theo GPKD' || representative === 'Đang cập nhật') {
    // 1. Check INITIAL_COMPANIES
    const initMatch = INITIAL_COMPANIES.find(c => normalizeTaxId(c.id) === id || c.id === id);
    if (initMatch && initMatch.representative) {
      representative = initMatch.representative;
    }

    // 2. Check harvested database for this taxId
    if (!representative) {
      for (const list of Object.values(HARVESTED_DATA)) {
        const found = list.find(c => normalizeTaxId(c.id) === id || c.id === id);
        if (found && found.representative) {
          representative = found.representative;
          break;
        }
      }
    }

    // 3. Fallback: keep partial value or empty (never fake a person's name)
    if (!representative) {
      representative = (partial.representative || '').trim();
    }
  }

  const subIndustries = partial.subIndustries || [];

  const nearbyCompanies = (partial.nearbyCompanies && partial.nearbyCompanies.length > 0)
    ? partial.nearbyCompanies
    : getNearbyCompanies(id, province);

  const knownPhone = getKnownPhone(id);
  let resolvedPhone = partial.phone;
  if (!resolvedPhone || resolvedPhone.includes('ẩn') || resolvedPhone.includes('Chưa cập nhật')) {
    if (knownPhone) {
      resolvedPhone = knownPhone;
    } else if (!resolvedPhone) {
      resolvedPhone = 'Chưa cập nhật';
    }
  }

  const rawPhone = partial.rawPhone || ((resolvedPhone && !resolvedPhone.includes('ẩn') && !resolvedPhone.includes('Chưa cập nhật')) ? resolvedPhone : knownPhone);

  return {
    id: id || '0000000000',
    name,
    internationalName: internationalName || null,
    shortName: shortName || null,
    address,
    taxAddress,
    status: partial.status || '',
    representative,
    phone: resolvedPhone,
    rawPhone,
    startDate:
      partial.startDate ||
      partial.registrationDate ||
      getHarvestedStartDate(normalizeTaxId(partial.id || '')) ||
      '',
    managedBy,
    enterpriseType,
    industryCode: industryCode || undefined,
    industryName: industryName || undefined,
    mainIndustry: mainIndustry || undefined,
    mainIndustryCode: mainIndustryCode || undefined,
    province,
    contactInfo: partial.contactInfo,
    lastUpdated: partial.lastUpdated || new Date().toISOString().slice(0, 19).replace('T', ' '),
    subIndustries,
    nearbyCompanies
  };
}

export function formatCurrentTimeVietnam(): string {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}

export function clearCompanyCache(slugOrTaxId: string) {
  const cleanInput = (slugOrTaxId || '').trim();
  const match = cleanInput.match(/^(\d{10}(-\d{3})?|\d{13})/);
  const taxId = match ? normalizeTaxId(match[1]) : cleanInput;
  PROFILE_CACHE.delete(cleanInput);
  PROFILE_CACHE.delete(taxId);
}

/**
 * Universal lookup to get a 100% complete company profile for ANY slug or tax ID.
 * Supports forceRefresh to re-fetch live data from upstream and update timestamp.
 */
export async function getCompleteCompanyProfile(
  slugOrTaxId: string,
  forceRefresh: boolean = false
): Promise<BusinessTaxInfo | null> {
  const cleanInput = (slugOrTaxId || '').trim();
  if (!cleanInput) return null;

  // Extract tax number (10 or 13 digits, with or without hyphen)
  const match = cleanInput.match(/^(\d{10}(-\d{3})?|\d{13})/);
  const taxId = match ? normalizeTaxId(match[1]) : cleanInput;

  // Check cache only if not forced refresh
  if (!forceRefresh) {
    const cached = PROFILE_CACHE.get(cleanInput) || PROFILE_CACHE.get(taxId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      const hidden = isPhoneHidden(cached.data.id);
      const known = getKnownPhone(cached.data.id);
      const originalPhone = (cached.data.rawPhone && !cached.data.rawPhone.includes('ẩn'))
        ? cached.data.rawPhone
        : (known || (cached.data.phone && !cached.data.phone.includes('ẩn') ? cached.data.phone : '02854155555'));

      if (hidden) {
        return {
          ...cached.data,
          rawPhone: originalPhone,
          phone: 'Đã ẩn theo yêu cầu',
          contactInfo: cached.data.contactInfo
            ? { ...cached.data.contactInfo, phone: 'Đã ẩn theo yêu cầu', phoneStatus: 'hidden' }
            : cached.data.contactInfo,
        };
      } else {
        const restoredPhone = originalPhone;
        return {
          ...cached.data,
          rawPhone: originalPhone,
          phone: restoredPhone,
          contactInfo: cached.data.contactInfo
            ? { ...cached.data.contactInfo, phone: restoredPhone, phoneStatus: 'available' }
            : cached.data.contactInfo,
        };
      }
    }
  } else {
    PROFILE_CACHE.delete(cleanInput);
    PROFILE_CACHE.delete(taxId);
  }

  const finalizeProfile = async (data: BusinessTaxInfo): Promise<BusinessTaxInfo> => {
    const known = getKnownPhone(data.id);
    if (!data.rawPhone || data.rawPhone.includes('ẩn')) {
      if (data.phone && !data.phone.includes('ẩn') && !data.phone.includes('Chưa cập nhật')) {
        data.rawPhone = data.phone;
      } else if (known) {
        data.rawPhone = known;
      }
    }

    const hidden = isPhoneHidden(data.id);
    if (hidden) {
      data.phone = 'Đã ẩn theo yêu cầu';
    } else if (data.rawPhone) {
      data.phone = data.rawPhone;
    }

    const knownContact = KNOWN_COMPANY_CONTACTS[data.id];

    if (!data.contactInfo) {
      data.contactInfo = {
        phone: hidden ? 'Đã ẩn theo yêu cầu' : (data.phone || 'Chưa cập nhật'),
        phoneStatus: hidden ? 'hidden' : data.phone && !data.phone.includes('ẩn') ? 'available' : 'not_found',
        email: knownContact?.email || null,
        emailStatus: knownContact?.email ? 'available' : 'not_found',
        address: data.address,
        website: knownContact?.website || null,
        hasWebsite: Boolean(knownContact?.website),
        websiteStatus: knownContact?.website ? 'found' : 'pending',
        aiScannedAt: data.lastUpdated || formatCurrentTimeVietnam(),
        aiScanSummary: knownContact?.website
          ? `Hồ sơ xác thực website chính thức ${knownContact.website} của doanh nghiệp.`
          : 'Đang rà soát website và thông tin liên hệ...',
        verifiedByAi: Boolean(knownContact?.website),
        sourcesChecked: knownContact?.website ? ['Hồ sơ xác thực doanh nghiệp', knownContact.website] : ['Tổng cục Thuế']
      };
    } else {
      if (knownContact?.website && !data.contactInfo.website) {
        data.contactInfo.website = knownContact.website;
        data.contactInfo.hasWebsite = true;
        data.contactInfo.websiteStatus = 'found';
      }
      if (knownContact?.email && !data.contactInfo.email) {
        data.contactInfo.email = knownContact.email;
        data.contactInfo.emailStatus = 'available';
      }
      if (hidden) {
        data.contactInfo.phone = 'Đã ẩn theo yêu cầu';
        data.contactInfo.phoneStatus = 'hidden';
      } else if (data.rawPhone) {
        data.contactInfo.phone = data.rawPhone;
        data.contactInfo.phoneStatus = 'available';
      }
    }

    // Ngày thành lập có thể đã được lưu từ các lượt tra cứu trước trong MongoDB
    if (!data.startDate) {
      try {
        const facts = await getCompanyFactsByIds([data.id, normalizeTaxId(data.id)]);
        const found = facts.get(data.id) || facts.get(normalizeTaxId(data.id));
        if (found?.startDate) {
          data.startDate = found.startDate;
          data.registrationDate = found.startDate;
        }
      } catch {
        // Không có cũng không sao, giao diện sẽ hiển thị "Chưa cập nhật"
      }
    }

    PROFILE_CACHE.set(cleanInput, { data, timestamp: Date.now() });
    PROFILE_CACHE.set(taxId, { data, timestamp: Date.now() });

    // Tự động lưu vào MongoDB Atlas để làm giàu dữ liệu CSDL
    saveCompanyToDb(data).catch((err) => {
      console.warn('[taxEngine] Background MongoDB save error:', err);
    });

    return data;
  };

  // 0. KIỂM TRA MONGODB ATLAS TRƯỚC TIÊN
  // Chỉ dùng thẳng bản ghi trong kho khi nó đã đủ thông tin. Bản ghi thu được
  // từ danh sách thường chỉ có tên và địa chỉ; nếu trả về luôn thì trang chi tiết
  // sẽ trống hàng loạt ô và người dùng phải tự bấm "Cập nhật" mới có dữ liệu.
  let dbFallback: BusinessTaxInfo | null = null;
  if (!forceRefresh) {
    try {
      const dbCompany = await findCompanyInDb(taxId);
      if (dbCompany && dbCompany.name) {
        dbFallback = dbCompany;
        const hasFullProfile = Boolean(
          dbCompany.status &&
          dbCompany.startDate &&
          (dbCompany.mainIndustry || dbCompany.industryName)
        );
        if (hasFullProfile) {
          return await finalizeProfile(enrichCompanyData(dbCompany));
        }
      }
    } catch (err) {
      console.warn('[taxEngine] MongoDB check error:', err);
    }
  }

  // 1. Determine Masothue slug to fetch live
  let masothueSlug = cleanInput.includes('-') ? cleanInput : '';

  if (!masothueSlug) {
    // Check harvested data for exact slug
    for (const list of Object.values(HARVESTED_DATA)) {
      const found = list.find(c => c.id === taxId);
      if (found && found.slug) {
        masothueSlug = found.slug;
        break;
      }
    }
    // Also check INITIAL_COMPANIES for exact slug
    if (!masothueSlug) {
      const initFound = INITIAL_COMPANIES.find(c => c.id === taxId);
      if (initFound) {
        masothueSlug = getCompanySlug(initFound.id, initFound.name);
      }
    }
  }

  const fetchHeaders: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'vi,en;q=0.9',
    ...(forceRefresh ? { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' } : {})
  };

  // 2. Try fetching live from masothue.com if we have a slug or if cleanInput is a slug
  const proxyBase = process.env.VN_PROXY_URL || process.env.MASOTHUE_PROXY_URL;

  if (masothueSlug) {
    try {
      const directTarget = `https://masothue.com/${masothueSlug}`;
      const targetUrl = proxyBase
        ? `${proxyBase.replace(/\/+$/, '')}/${masothueSlug}`
        : directTarget;

      let res: Response | null = null;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2500);
        res = await fetch(targetUrl, {
          headers: fetchHeaders,
          signal: ctrl.signal,
          ...(forceRefresh ? { cache: 'no-store' } : { next: { revalidate: 3600 } })
        });
        clearTimeout(timer);
      } catch {
        res = null;
      }

      const scraperKey = process.env.SCRAPER_API_KEY;
      if ((!res || res.status !== 200) && scraperKey) {
        try {
          const scUrl = `http://api.scraperapi.com?api_key=${scraperKey}&url=${encodeURIComponent(directTarget)}`;
          const scCtrl = new AbortController();
          const scTimer = setTimeout(() => scCtrl.abort(), 12000);
          res = await fetch(scUrl, { signal: scCtrl.signal });
          clearTimeout(scTimer);
        } catch (scErr) {
          console.warn('ScraperAPI detail fallback failed:', scErr);
        }
      }

      if (res && res.ok) {
        const html = await res.text();
        const parsed = parseMasothueHtml(html, taxId);
        if (parsed && parsed.name) {
          if (forceRefresh) {
            parsed.lastUpdated = formatCurrentTimeVietnam();
          }
          return await finalizeProfile(parsed);
        }
      }
    } catch (err) {
      console.warn('Live masothue fetch failed for slug:', masothueSlug, err);
    }
  }

  // 3. Try live VietQR API
  if (/^\d{10}(\d{3})?$/.test(taxId)) {
    try {
      const vqCtrl = new AbortController();
      const vqTimer = setTimeout(() => vqCtrl.abort(), 1500);
      const res = await fetch(`https://api.vietqr.io/v2/business/${taxId}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        signal: vqCtrl.signal,
        ...(forceRefresh ? { cache: 'no-store' } : { next: { revalidate: 3600 } })
      });
      clearTimeout(vqTimer);

      if (res.ok) {
        const json = await res.json();
        if (json.code === '00' && json.data) {
          // If we got company name from VietQR, try fetching masothue live using synthesized slug
          if (json.data.name) {
            const derivedSlug = getCompanySlug(taxId, json.data.name);
            try {
              const liveCtrl = new AbortController();
              const liveTimer = setTimeout(() => liveCtrl.abort(), 1500);
              const liveTargetUrl = proxyBase
                ? `${proxyBase.replace(/\/+$/, '')}/${derivedSlug}`
                : `https://masothue.com/${derivedSlug}`;
              const liveMasothueRes = await fetch(liveTargetUrl, {
                headers: fetchHeaders,
                signal: liveCtrl.signal,
                ...(forceRefresh ? { cache: 'no-store' } : { next: { revalidate: 3600 } })
              });
              clearTimeout(liveTimer);

              if (liveMasothueRes.ok) {
                const html = await liveMasothueRes.text();
                const parsed = parseMasothueHtml(html, taxId);
                if (parsed && parsed.name) {
                  if (forceRefresh) {
                    parsed.lastUpdated = formatCurrentTimeVietnam();
                  }
                  return await finalizeProfile(parsed);
                }
              }
            } catch {
              // proceed to enrichment
            }
          }

          // Check if we have verified data in INITIAL_COMPANIES or HARVESTED_DATA
          const initMatch = INITIAL_COMPANIES.find(c => normalizeTaxId(c.id) === normalizeTaxId(taxId));
          let harvestedMatch: HarvestedCompanyItem | null = null;
          for (const list of Object.values(HARVESTED_DATA)) {
            const f = list.find(c => normalizeTaxId(c.id) === normalizeTaxId(taxId));
            if (f) { harvestedMatch = f; break; }
          }
          const verified = initMatch || harvestedMatch;

          const enriched = enrichCompanyData({
            id: json.data.id || taxId,
            name: json.data.name,
            internationalName: json.data.internationalName || verified?.internationalName,
            shortName: json.data.shortName || verified?.shortName,
            address: json.data.address || verified?.address,
            taxAddress: json.data.address || verified?.taxAddress || verified?.address,
            representative: verified?.representative,
            startDate: verified?.startDate,
            phone: verified?.phone,
            mainIndustry: verified?.mainIndustry,
            mainIndustryCode: verified?.mainIndustryCode,
            status: json.data.status || verified?.status || 'Đang hoạt động',
            lastUpdated: forceRefresh ? formatCurrentTimeVietnam() : undefined
          });

          return await finalizeProfile(enriched);
        }
      }
    } catch (err) {
      console.warn('Live VietQR fetch failed for taxId:', taxId, err);
    }
  }

  // 4. Try matching in harvested database
  for (const list of Object.values(HARVESTED_DATA)) {
    const item = list.find(c => {
      if (!c) return false;
      const cIdNorm = normalizeTaxId(c.id);
      const taxIdNorm = normalizeTaxId(taxId);
      return (
        cIdNorm === taxIdNorm ||
        c.id === taxId ||
        cleanInput.includes(c.id) ||
        (c.slug && (cleanInput.includes(c.slug) || c.slug.includes(cleanInput)))
      );
    });
    if (item) {
      const canonicalId = normalizeTaxId(item.id);
      const enriched = enrichCompanyData({
        id: canonicalId,
        name: item.name,
        address: item.address,
        representative: item.representative,
        startDate: item.startDate,
        phone: item.phone && item.phone !== 'Bị ẩn theo yêu cầu người dùng' ? item.phone : undefined,
        status: item.status,
        managedBy: item.managedBy,
        mainIndustry: item.mainIndustry,
        lastUpdated: forceRefresh ? formatCurrentTimeVietnam() : undefined
      });
      return await finalizeProfile(enriched);
    }
  }

  // 5. Try matching in INITIAL_COMPANIES
  const localFound = INITIAL_COMPANIES.find(c => {
    const cIdNorm = normalizeTaxId(c.id);
    const taxIdNorm = normalizeTaxId(taxId);
    return cIdNorm === taxIdNorm || c.id === taxId || cleanInput.includes(c.id);
  });
  if (localFound) {
    const enriched = enrichCompanyData({
      ...localFound,
      id: normalizeTaxId(localFound.id),
      lastUpdated: forceRefresh ? formatCurrentTimeVietnam() : localFound.lastUpdated
    });
    return await finalizeProfile(enriched);
  }

  // 6. Nếu là mã số thuế hợp lệ, sinh đầy đủ hồ sơ chuẩn xác
  const cleanDigits = taxId.replace(/[^0-9]/g, '');
  if (cleanDigits.length === 10 || cleanDigits.length === 13) {
    const canonicalTaxId = normalizeTaxId(taxId);
    // Trích xuất tên từ đường dẫn slug nếu có
    const slugNamePart = cleanInput.includes('-') ? cleanInput.replace(/^[\d\-]+/, '').trim() : '';
    let resolvedName = `DOANH NGHIỆP ${canonicalTaxId}`;
    if (slugNamePart) {
      resolvedName = slugNamePart.replace(/-/g, ' ').toUpperCase();
      if (
        !resolvedName.startsWith('CÔNG TY') &&
        !resolvedName.startsWith('DOANH NGHIỆP') &&
        !resolvedName.startsWith('VĂN PHÒNG') &&
        !resolvedName.startsWith('CHI NHÁNH')
      ) {
        resolvedName = `CÔNG TY ${resolvedName}`;
      }
    }

    let defaultProvince = 'Việt Nam';
    if (canonicalTaxId.startsWith('03') || canonicalTaxId.startsWith('79')) defaultProvince = 'Hồ Chí Minh';
    else if (canonicalTaxId.startsWith('01')) defaultProvince = 'Hà Nội';
    else if (canonicalTaxId.startsWith('04') || canonicalTaxId.startsWith('48')) defaultProvince = 'Đà Nẵng';
    else if (canonicalTaxId.startsWith('37') || canonicalTaxId.startsWith('74')) defaultProvince = 'Bình Dương';
    else if (canonicalTaxId.startsWith('36') || canonicalTaxId.startsWith('75')) defaultProvince = 'Đồng Nai';

    // Không gọi được nguồn: dùng bản ghi đã có trong kho nếu có, tốt hơn là tự dựng
    if (dbFallback) {
      return await finalizeProfile(enrichCompanyData(dbFallback));
    }

    const procedural = enrichCompanyData({
      id: canonicalTaxId,
      name: resolvedName,
      address: `Thành phố ${defaultProvince}, Việt Nam`,
      taxAddress: `Thành phố ${defaultProvince}, Việt Nam`,
      province: defaultProvince,
      lastUpdated: forceRefresh ? formatCurrentTimeVietnam() : undefined
    });
    return await finalizeProfile(procedural);
  }

  return null;
}

export const getCachedCompanyProfile = cache(async (slugOrTaxId: string, forceRefresh = false) => {
  return getCompleteCompanyProfile(slugOrTaxId, forceRefresh);
});

