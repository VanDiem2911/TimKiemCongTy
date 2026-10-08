import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SearchX, Home, Building2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#c51322] flex items-center justify-center mx-auto mb-5">
            <SearchX className="w-8 h-8" />
          </div>

          <p className="text-sm font-bold text-[#c51322] tracking-wider mb-2">LỖI 404</p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
            Không tìm thấy trang này
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed mb-7">
            Mã số thuế hoặc doanh nghiệp bạn tìm không có trong hệ thống, hoặc đường dẫn đã thay
            đổi. Bạn thử tra cứu lại bằng mã số thuế hoặc tên doanh nghiệp nhé.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto bg-[#e91a2c] hover:bg-[#c51322] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Về trang tra cứu</span>
            </Link>

            <Link
              href="/tra-cuu-ma-so-thue-theo-tinh/"
              className="w-full sm:w-auto bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Xem theo tỉnh thành</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
