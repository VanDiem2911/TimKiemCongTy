import { ProvinceItem, IndustryItem, BusinessTaxInfo } from '@/types/tax';

export function getCompanySlug(id: string, name?: string): string {
  if (!name) return id;
  const cleanName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleanName ? `${id}-${cleanName}` : id;
}

export function getCompanyStatusBadgeClass(status?: string | null): string {
  if (!status) return 'bg-gray-100 text-gray-700 border-gray-200';
  const s = status.toLowerCase();

  // 1. Ngừng hoạt động / Đã giải thể / Chấm dứt hiệu lực MST / Bị thu hồi / Phá sản -> Màu ĐỎ
  if (
    s.includes('ngừng hoạt động') ||
    s.includes('chấm dứt') ||
    s.includes('giải thể') ||
    s.includes('bị thu hồi') ||
    s.includes('đóng mã số thuế') ||
    s.includes('phá sản') ||
    s.includes('đã khóa')
  ) {
    return 'bg-red-50 text-red-700 border-red-200';
  }

  // 2. Tạm ngừng hoạt động / Tạm ngừng kinh doanh -> Màu VÀNG/CAM
  if (s.includes('tạm ngừng') || s.includes('tạm hoãn') || s.includes('chờ')) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }

  // 3. Không hoạt động tại địa chỉ đăng ký -> Màu HỒNG ĐỎ CẢNH BÁO
  if (s.includes('không hoạt động tại') || s.includes('bỏ trốn') || s.includes('bỏ địa chỉ')) {
    return 'bg-rose-50 text-rose-800 border-rose-200';
  }

  // 4. Đang hoạt động -> Màu XANH LÁ
  if (s.includes('đang hoạt động') || s.includes('được cấp gcn') || s.includes('hoạt động')) {
    return 'bg-green-50 text-green-700 border-green-200';
  }

  return 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export const PROVINCES: ProvinceItem[] = [
  { name: 'Hà Nội', slug: 'ha-noi-7', code: '01', region: 'Bắc', isMajor: true },
  { name: 'Hồ Chí Minh', slug: 'ho-chi-minh-23', code: '79', region: 'Nam', isMajor: true },
  { name: 'Đà Nẵng', slug: 'da-nang-35', code: '48', region: 'Trung', isMajor: true },
  { name: 'Hải Phòng', slug: 'hai-phong-99', code: '31', region: 'Bắc', isMajor: true },
  { name: 'Cần Thơ', slug: 'can-tho-96', code: '92', region: 'Nam', isMajor: true },
  { name: 'Bình Dương', slug: 'binh-duong-17', code: '74', region: 'Nam', isMajor: true },
  { name: 'Đồng Nai', slug: 'dong-nai-57', code: '75', region: 'Nam', isMajor: true },
  { name: 'Bà Rịa - Vũng Tàu', slug: 'ba-ria-vung-tau-32', code: '77', region: 'Nam' },
  { name: 'An Giang', slug: 'an-giang-93', code: '89', region: 'Nam' },
  { name: 'Bắc Giang', slug: 'bac-giang-72', code: '24', region: 'Bắc' },
  { name: 'Bắc Kạn', slug: 'bac-kan-1127', code: '06', region: 'Bắc' },
  { name: 'Bạc Liêu', slug: 'bac-lieu-197', code: '95', region: 'Nam' },
  { name: 'Bắc Ninh', slug: 'bac-ninh-170', code: '27', region: 'Bắc' },
  { name: 'Bến Tre', slug: 'ben-tre-185', code: '83', region: 'Nam' },
  { name: 'Bình Định', slug: 'binh-dinh-152', code: '52', region: 'Trung' },
  { name: 'Bình Phước', slug: 'binh-phuoc-1', code: '70', region: 'Nam' },
  { name: 'Bình Thuận', slug: 'binh-thuan-20', code: '60', region: 'Trung' },
  { name: 'Cà Mau', slug: 'ca-mau-108', code: '96', region: 'Nam' },
  { name: 'Cao Bằng', slug: 'cao-bang-1612', code: '04', region: 'Bắc' },
  { name: 'Đắk Lắk', slug: 'dak-lak-214', code: '66', region: 'Trung' },
  { name: 'Đắk Nông', slug: 'dak-nong-245', code: '67', region: 'Trung' },
  { name: 'Điện Biên', slug: 'dien-bien-1007', code: '11', region: 'Bắc' },
  { name: 'Đồng Tháp', slug: 'dong-thap-63', code: '87', region: 'Nam' },
  { name: 'Gia Lai', slug: 'gia-lai-563', code: '64', region: 'Trung' },
  { name: 'Hà Giang', slug: 'ha-giang-529', code: '02', region: 'Bắc' },
  { name: 'Hà Nam', slug: 'ha-nam-162', code: '35', region: 'Bắc' },
  { name: 'Hà Tĩnh', slug: 'ha-tinh-342', code: '42', region: 'Trung' },
  { name: 'Hải Dương', slug: 'hai-duong-147', code: '30', region: 'Bắc' },
  { name: 'Hậu Giang', slug: 'hau-giang-190', code: '93', region: 'Nam' },
  { name: 'Hòa Bình', slug: 'hoa-binh-786', code: '17', region: 'Bắc' },
  { name: 'Hưng Yên', slug: 'hung-yen-123', code: '33', region: 'Bắc' },
  { name: 'Khánh Hòa', slug: 'khanh-hoa-26', code: '56', region: 'Trung' },
  { name: 'Kiên Giang', slug: 'kien-giang-80', code: '91', region: 'Nam' },
  { name: 'Kon Tum', slug: 'kon-tum-956', code: '62', region: 'Trung' },
  { name: 'Lai Châu', slug: 'lai-chau-2501', code: '12', region: 'Bắc' },
  { name: 'Lâm Đồng', slug: 'lam-dong-10', code: '68', region: 'Trung' },
  { name: 'Lạng Sơn', slug: 'lang-son-984', code: '20', region: 'Bắc' },
  { name: 'Lào Cai', slug: 'lao-cai-320', code: '10', region: 'Bắc' },
  { name: 'Long An', slug: 'long-an-29', code: '80', region: 'Nam' },
  { name: 'Nam Định', slug: 'nam-dinh-137', code: '36', region: 'Bắc' },
  { name: 'Nghệ An', slug: 'nghe-an-144', code: '40', region: 'Trung' },
  { name: 'Ninh Bình', slug: 'ninh-binh-75', code: '37', region: 'Bắc' },
  { name: 'Ninh Thuận', slug: 'ninh-thuan-11', code: '58', region: 'Trung' },
  { name: 'Phú Thọ', slug: 'phu-tho-134', code: '25', region: 'Bắc' },
  { name: 'Phú Yên', slug: 'phu-yen-14', code: '54', region: 'Trung' },
  { name: 'Quảng Bình', slug: 'quang-binh-60', code: '44', region: 'Trung' },
  { name: 'Quảng Nam', slug: 'quang-nam-49', code: '49', region: 'Trung' },
  { name: 'Quảng Ngãi', slug: 'quang-ngai-301', code: '51', region: 'Trung' },
  { name: 'Quảng Ninh', slug: 'quang-ninh-142', code: '22', region: 'Bắc' },
  { name: 'Quảng Trị', slug: 'quang-tri-69', code: '45', region: 'Trung' },
  { name: 'Sóc Trăng', slug: 'soc-trang-949', code: '94', region: 'Nam' },
  { name: 'Sơn La', slug: 'son-la-316', code: '14', region: 'Bắc' },
  { name: 'Tây Ninh', slug: 'tay-ninh-90', code: '72', region: 'Nam' },
  { name: 'Thái Bình', slug: 'thai-binh-128', code: '34', region: 'Bắc' },
  { name: 'Thái Nguyên', slug: 'thai-nguyen-131', code: '19', region: 'Bắc' },
  { name: 'Thanh Hóa', slug: 'thanh-hoa-4', code: '38', region: 'Trung' },
  { name: 'Thừa Thiên Huế', slug: 'thua-thien-hue-66', code: '46', region: 'Trung' },
  { name: 'Tiền Giang', slug: 'tien-giang-177', code: '82', region: 'Nam' },
  { name: 'Trà Vinh', slug: 'tra-vinh-41', code: '84', region: 'Nam' },
  { name: 'Tuyên Quang', slug: 'tuyen-quang-1284', code: '08', region: 'Bắc' },
  { name: 'Vĩnh Long', slug: 'vinh-long-193', code: '86', region: 'Nam' },
  { name: 'Vĩnh Phúc', slug: 'vinh-phuc-420', code: '26', region: 'Bắc' },
  { name: 'Yên Bái', slug: 'yen-bai-724', code: '15', region: 'Bắc' }
];

export const INDUSTRIES: IndustryItem[] = [
  { code: '4659', name: 'Bán buôn máy móc, thiết bị và phụ tùng máy khác', slug: 'ban-buon-may-moc-thiet-bi-va-phu-tung-may-khac-4659' },
  { code: '4610', name: 'Đại lý, môi giới, đấu giá', slug: 'dai-ly-moi-gioi-dau-gia-4610' },
  { code: '4649', name: 'Bán buôn đồ dùng khác cho gia đình', slug: 'ban-buon-do-dung-khac-cho-gia-dinh-4649' },
  { code: '4931', name: 'Vận tải hành khách đường bộ trong nội thành, ngoại thành', slug: 'van-tai-hanh-khach-duong-bo-trong-noi-thanh-ngoai-thanh-tru-van-tai-bang-xe-buyt-4931' },
  { code: '1701', name: 'Sản xuất bột giấy, giấy và bìa', slug: 'san-xuat-bot-giay-giay-va-bia-1701' },
  { code: '4669', name: 'Bán buôn chuyên doanh khác chưa được phân vào đâu', slug: 'ban-buon-chuyen-doanh-khac-chua-duoc-phan-vao-dau-4669' },
  { code: '2011', name: 'Sản xuất hoá chất cơ bản', slug: 'san-xuat-hoa-chat-co-ban-2011' },
  { code: '4933', name: 'Vận tải hàng hóa bằng đường bộ', slug: 'van-tai-hang-hoa-bang-duong-bo-4933' },
  { code: '7490', name: 'Hoạt động chuyên môn, khoa học và công nghệ khác chưa được phân vào đâu', slug: 'hoat-dong-chuyen-mon-khoa-hoc-va-cong-nghe-khac-chua-duoc-phan-vao-dau-7490' },
  { code: '1812', name: 'Dịch vụ liên quan đến in', slug: 'dich-vu-lien-quan-den-in-1812' },
  { code: '1811', name: 'In ấn', slug: 'in-an-1811' },
  { code: '6619', name: 'Hoạt động hỗ trợ dịch vụ tài chính chưa được phân vào đâu', slug: 'hoat-dong-ho-tro-dich-vu-tai-chinh-chua-duoc-phan-vao-dau-6619' },
  { code: '8219', name: 'Photo, chuẩn bị tài liệu và các hoạt động hỗ trợ văn phòng', slug: 'photo-chuan-bi-tai-lieu-va-cac-hoat-dong-ho-tro-van-phong-dac-biet-khac-8219' },
  { code: '5913', name: 'Hoạt động phát hành phim điện ảnh, phim video và truyền hình', slug: 'hoat-dong-phat-hanh-phim-dien-anh-phim-video-va-chuong-trinh-truyen-hinh-5913' },
  { code: '4641', name: 'Bán buôn vải, hàng may sẵn, giày dép', slug: 'ban-buon-vai-hang-may-san-giay-dep-4641' },
  { code: '4771', name: 'Bán lẻ hàng may mặc, giày dép, hàng da và giả da', slug: 'ban-le-hang-may-mac-giay-dep-hang-da-va-gia-da-trong-cac-cua-hang-chuyen-doanh-4771' },
  { code: '4330', name: 'Hoàn thiện công trình xây dựng', slug: 'hoan-thien-cong-trinh-xay-dung-4330' },
  { code: '4761', name: 'Bán lẻ sách, báo, tạp chí, văn phòng phẩm', slug: 'ban-le-sach-bao-tap-chi-van-phong-pham-trong-cac-cua-hang-chuyen-doanh-4761' },
  { code: '7410', name: 'Hoạt động thiết kế chuyên dụng', slug: 'hoat-dong-thiet-ke-chuyen-dung-7410' },
  { code: '7310', name: 'Quảng cáo', slug: 'quang-cao-7310' },
  { code: '7710', name: 'Cho thuê xe có động cơ', slug: 'cho-thue-xe-co-dong-co-7710' },
  { code: '9631', name: 'Cắt tóc, làm đầu, gội đầu', slug: 'cat-toc-lam-dau-goi-dau-9631' },
  { code: '4651', name: 'Bán buôn máy vi tính, thiết bị ngoại vi và phần mềm', slug: 'ban-buon-may-vi-tinh-thiet-bi-ngoai-vi-va-phan-mem-4651' },
  { code: '4652', name: 'Bán buôn thiết bị và linh kiện điện tử, viễn thông', slug: 'ban-buon-thiet-bi-va-linh-kien-dien-tu-vien-thong-4652' },
  { code: '9511', name: 'Sửa chữa máy vi tính và thiết bị ngoại vi', slug: 'sua-chua-may-vi-tinh-va-thiet-bi-ngoai-vi-9511' }
];

export const INITIAL_COMPANIES: BusinessTaxInfo[] = [
  {
    id: '0319641544',
    name: 'CÔNG TY TNHH GIẢI PHÁP PHẦN MỀM DUDI',
    internationalName: 'DUDI SOFTWARE SOLUTIONS COMPANY LIMITED',
    shortName: 'DUDI SOFTWARE SOLUTIONS CO.,LTD',
    address: '49/2 đường Số 14, Phường Thủ Đức, Thành phố Hồ Chí Minh, Việt Nam',
    status: 'Đang hoạt động',
    representative: 'NGUYỄN THỊ HẢO',
    phone: '0908123456',
    industryName: 'Lập trình máy tính khác (6219)',
    province: 'TP Hồ Chí Minh'
  },
  {
    id: '3502593768',
    name: 'CÔNG TY CỔ PHẦN TÔN VINA ONE (NTNN)',
    address: 'Đường Đ07, Khu Công Nghiệp Châu Đức, Thôn Hữu Phước, Xã Ngãi Giao, TP Hồ Chí Minh',
    status: 'NNT đang hoạt động (đã được cấp GCN ĐKT)',
    representative: 'ĐẶNG BÁ HƯNG',
    phone: '02723778899',
    industryName: 'Sản xuất sắt, thép, gang',
    province: 'TP Hồ Chí Minh'
  },
  {
    id: '0319732689',
    name: 'CÔNG TY TNHH IGL WORLDWIDE',
    address: 'Tầng 1, Tòa nhà International Plaza, Số 343 Phạm Ngũ Lão, Phường Bến Thành, Thành phố Hồ Chí Minh',
    status: 'NNT đang hoạt động',
    representative: 'NGUYỄN THỤY BÍCH HOÀN',
    phone: '02839251868',
    industryName: 'Hoạt động dịch vụ hỗ trợ khác liên quan đến vận tải',
    province: 'Hồ Chí Minh'
  },
  {
    id: '5400575731',
    name: 'CÔNG TY TNHH BAO BÌ THỊNH THÁI',
    address: 'Tiểu Khu 11, Xã Lương Sơn, Tỉnh Phú Thọ, Việt Nam',
    status: 'NNT đang hoạt động',
    representative: 'LƯƠNG THỊ MINH',
    phone: '02103846666',
    industryName: 'Sản xuất bao bì bằng giấy, bìa',
    province: 'Phú Thọ'
  },
  {
    id: '0301446260',
    name: 'CÔNG TY CỔ PHẦN HÓA CHẤT CƠ BẢN MIỀN NAM',
    internationalName: 'SOUTH BASIC CHEMICALS JOINT STOCK COMPANY',
    shortName: 'HÓA CHẤT CƠ BẢN MIỀN NAM',
    address: '22 Lý Tự Trọng, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',
    status: 'NNT đang hoạt động',
    representative: 'LÊ BÁ ANH',
    phone: '02838296620',
    industryName: 'Sản xuất hoá chất cơ bản',
    province: 'Hồ Chí Minh'
  },
  {
    id: '0100109106',
    name: 'TẬP ĐOÀN CÔNG NGHIỆP - VIỄN THÔNG QUÂN ĐỘI',
    internationalName: 'MILITARY INDUSTRY - TELECOMS GROUP',
    shortName: 'VIETTEL',
    address: 'Lô D26, Khu đô thị mới Cầu Giấy, Phường Yên Hòa, Quận Cầu Giấy, Thành phố Hà Nội',
    status: 'NNT đang hoạt động',
    representative: 'TÀO ĐỨC THẮNG',
    phone: '02462556789',
    industryName: 'Hoạt động viễn thông có dây',
    province: 'Hà Nội'
  },
  {
    id: '0300588569',
    name: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM',
    internationalName: 'VIETNAM DAIRY PRODUCTS JOINT STOCK COMPANY',
    shortName: 'VINAMILK',
    address: 'Số 10, Đường Tân Trào, Phường Tân Phú, Quận 7, Thành phố Hồ Chí Minh',
    status: 'NNT đang hoạt động',
    representative: 'MAI KIỀU LIÊN',
    phone: '02854155555',
    industryName: 'Chế biến sữa và các sản phẩm từ sữa',
    province: 'Hồ Chí Minh'
  },
  {
    id: '0100681592',
    name: 'TẬP ĐOÀN CÔNG NGHIỆP - NĂNG LƯỢNG QUỐC GIA VIỆT NAM',
    internationalName: 'VIETNAM OIL AND GAS GROUP',
    shortName: 'PETROVIETNAM',
    address: '18 Phố Láng Hạ, Phường Giảng Võ, Quận Ba Đình, Thành phố Hà Nội',
    status: 'NNT đang hoạt động',
    representative: 'LÊ MẠNH HÙNG',
    phone: '02438252526',
    industryName: 'Khai thác dầu thô và khí đốt tự nhiên',
    province: 'Hà Nội'
  }
];
