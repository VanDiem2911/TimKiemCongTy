export interface CompanyContactAI {
  phone: string;
  phoneStatus: 'available' | 'hidden' | 'not_found';
  email: string | null;
  emailStatus: 'available' | 'not_found';
  address: string;
  website: string | null;
  hasWebsite: boolean;
  websiteStatus: 'found' | 'not_found' | 'pending' | 'scanning';
  socialLinks?: Array<{
    platform: 'facebook' | 'zalo' | 'linkedin' | 'website' | 'youtube';
    url: string;
    label: string;
  }>;
  aiScannedAt: string;
  aiScanSummary: string;
  verifiedByAi: boolean;
  sourcesChecked: string[];
}

export interface BusinessTaxInfo {
  id: string; // Mã số thuế (10 or 13 digits)
  name: string; // Tên công ty
  internationalName?: string | null; // Tên quốc tế
  shortName?: string | null; // Tên viết tắt
  address: string; // Địa chỉ trụ sở
  taxAddress?: string; // Địa chỉ nhận thông báo Thuế
  status: string; // Trạng thái hoạt động
  representative?: string; // Người đại diện pháp luật
  phone?: string; // Điện thoại
  rawPhone?: string; // Số điện thoại gốc trước khi ẩn
  startDate?: string; // Ngày hoạt động
  managedBy?: string; // Cơ quan thuế quản lý
  enterpriseType?: string; // Loại hình DN
  industryCode?: string; // Mã ngành chính
  industryName?: string; // Ngành nghề kinh doanh
  mainIndustry?: string; // Tên ngành nghề chính đầy đủ
  mainIndustryCode?: string; // Mã VSIC chính
  province?: string; // Tỉnh / Thành phố
  registrationDate?: string; // Ngày cấp phép
  lastUpdated?: string; // Thời gian cập nhật cuối
  subIndustries?: Array<{ code: string; name: string; isMain: boolean }>;
  nearbyCompanies?: Array<{ id: string; name: string; rep?: string; address?: string }>;
  contactInfo?: CompanyContactAI;
}

export interface IndustryItem {
  code: string;
  name: string;
  slug: string;
  enterpriseCount?: number;
}

export interface ProvinceItem {
  name: string;
  slug: string;
  code: string;
  region: 'Bắc' | 'Trung' | 'Nam';
  isMajor?: boolean;
}
