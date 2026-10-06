'use client';

import React from 'react';

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs mt-auto border-t border-slate-900 py-6">
      <div className="mst-container space-y-3 text-center sm:text-left">
        <p className="text-slate-400 text-xs sm:text-[13px] leading-relaxed max-w-4xl">
          Dữ liệu được tổng hợp và đối soát công khai trực tiếp từ <strong className="text-slate-200 font-medium">Cổng thông tin quốc gia về đăng ký doanh nghiệp</strong> (dangkykinhdoanh.gov.vn) và <strong className="text-slate-200 font-medium">Hệ thống quản lý dữ liệu người nộp thuế của Tổng cục Thuế Việt Nam</strong> (gdt.gov.vn).
        </p>

        {/* Dòng bản quyền copyright ở dưới cùng */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] gap-2 pt-3 border-t border-slate-900">
          <p>© 2026 TimKiemCongTy.com — Tra Cứu Mã Số Thuế &amp; Doanh Nghiệp Toàn Quốc.</p>
          <p>Cổng tra cứu thông tin doanh nghiệp người nộp thuế toàn quốc.</p>
        </div>
      </div>
    </footer>
  );
}
