'use client';

import React from 'react';

export function Footer() {
  return (
    <footer className="bg-white mt-auto border-t border-gray-200">
      <div className="mst-container py-8">
        <p className="text-[13px] leading-[1.75] text-slate-500 text-center max-w-3xl mx-auto">
          Dữ liệu được tổng hợp và đối soát công khai trực tiếp từ{' '}
          <strong className="font-semibold text-slate-700">Cổng thông tin quốc gia về đăng ký doanh nghiệp</strong>{' '}
          <span className="text-slate-400">(dangkykinhdoanh.gov.vn)</span> và{' '}
          <strong className="font-semibold text-slate-700">
            Hệ thống quản lý dữ liệu người nộp thuế của Tổng cục Thuế Việt Nam
          </strong>{' '}
          <span className="text-slate-400">(gdt.gov.vn)</span>.
        </p>

        {/* Dòng bản quyền copyright ở dưới cùng */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-slate-400 text-center">
          <p>© 2026 TimKiemCongTy.com — Tra Cứu Mã Số Thuế &amp; Doanh Nghiệp Toàn Quốc.</p>
          <p>Cổng tra cứu thông tin doanh nghiệp người nộp thuế toàn quốc.</p>
        </div>
      </div>
    </footer>
  );
}
