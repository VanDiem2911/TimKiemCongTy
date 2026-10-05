'use client';

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#333e48] text-gray-300 text-xs mt-auto">
      {/* Newsletter */}
      <div className="bg-[#242b32] py-4 border-b border-gray-700">
        <div className="mst-container flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center max-w-3xl">
            <span className="text-gray-200 text-xs sm:text-sm font-medium leading-relaxed">
              Dữ liệu được truy vấn và cập nhật theo thời gian thực kết nối trực tiếp với Cổng thông tin Tổng cục Thuế và Cổng Thông Tin Quốc Gia về đăng ký doanh nghiệp
            </span>
          </div>
          <form className="flex w-full sm:w-auto" onSubmit={(e) => { e.preventDefault(); alert('Cảm ơn bạn đã đăng ký nhận tin!'); }}>
            <input
              type="email"
              placeholder="Nhập email của bạn..."
              className="px-3 py-1.5 text-xs bg-gray-800 text-white border border-gray-600 rounded-l focus:outline-none focus:border-amber-400 w-64"
              required
            />
            <button
              type="submit"
              className="bg-[#fed700] hover:bg-[#e0b200] text-gray-900 font-semibold px-4 py-1.5 rounded-r transition-colors"
            >
              Đăng ký
            </button>
          </form>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mst-container py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-bold text-white text-sm uppercase mb-3 text-[#fed700]">Truy cập nhanh</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/tra-cuu-ma-so-thue-ca-nhan/" className="hover:text-amber-400">
                  Tra cứu mã số thuế cá nhân
                </Link>
              </li>
              <li>
                <Link href="/tra-cuu-ma-so-thue-theo-nganh-nghe/" className="hover:text-amber-400">
                  Tra cứu theo ngành nghề
                </Link>
              </li>
              <li>
                <Link href="/tra-cuu-ma-so-thue-theo-tinh/" className="hover:text-amber-400">
                  Tra cứu theo tỉnh thành
                </Link>
              </li>
              <li>
                <Link href="/lien-he/" className="hover:text-amber-400">
                  Liên hệ đóng góp ý kiến
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm uppercase mb-3 text-[#fed700]">Tỉnh thành lớn</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link href="/tra-cuu-ma-so-thue-theo-tinh/ho-chi-minh-23" className="hover:text-amber-400">TP Hồ Chí Minh</Link></li>
              <li><Link href="/tra-cuu-ma-so-thue-theo-tinh/ha-noi-7" className="hover:text-amber-400">Hà Nội</Link></li>
              <li><Link href="/tra-cuu-ma-so-thue-theo-tinh/da-nang-35" className="hover:text-amber-400">Đà Nẵng</Link></li>
              <li><Link href="/tra-cuu-ma-so-thue-theo-tinh/binh-duong-17" className="hover:text-amber-400">Bình Dương</Link></li>
              <li><Link href="/tra-cuu-ma-so-thue-theo-tinh/dong-nai-57" className="hover:text-amber-400">Đồng Nai</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm uppercase mb-3 text-[#fed700]">Loại hình công ty</h4>
            <ul className="space-y-2 text-gray-300">
              <li><span className="text-gray-400">Công ty TNHH 1 thành viên</span></li>
              <li><span className="text-gray-400">Công ty TNHH 2 thành viên trở lên</span></li>
              <li><span className="text-gray-400">Công ty Cổ phần</span></li>
              <li><span className="text-gray-400">Doanh nghiệp tư nhân</span></li>
              <li><span className="text-gray-400">Hộ kinh doanh cá thể</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm uppercase mb-3 text-[#fed700]">Thông tin giới thiệu</h4>
            <p className="text-gray-400 leading-relaxed mb-3">
              Tìm Kiếm Công Ty (timkiemcongty.com) cung cấp công cụ tra cứu mã số thuế doanh nghiệp, mã số thuế cá nhân nhanh chóng, chính xác từ cơ sở dữ liệu công khai của Tổng cục Thuế Việt Nam.
            </p>
            <p className="text-xs text-gray-500">
              Email: support@timkiemcongty.com<br />
              Dữ liệu được cập nhật liên tục theo chuẩn kết nối gdt.gov.vn.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700 flex flex-wrap justify-between items-center text-gray-500">
          <p>© 2026 TimKiemCongTy.com - Tra Cứu Mã Số Thuế & Thông Tin Doanh Nghiệp Toàn Quốc.</p>
          <p>Cổng tra cứu thông tin doanh nghiệp, mã số thuế người nộp thuế toàn quốc.</p>
        </div>
      </div>
    </footer>
  );
}
