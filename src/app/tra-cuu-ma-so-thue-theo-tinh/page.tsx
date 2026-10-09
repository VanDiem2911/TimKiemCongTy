import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PROVINCES, getCompanySlug, normalizeTaxId, formatEstablishedDate, getCompanyStatusBadgeClass, getCompanyStatusTone } from '@/lib/constants';
import { fetchLiveNationwideCompanies } from '@/lib/provinceCompanies';
import { MapPin, ChevronRight, User, ChevronLeft, ChevronsLeft, ChevronsRight, ShieldCheck, Flame, Calendar, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ page?: string; region?: string }>;
}

export default async function ProvinceTaxPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.page || '1', 10) || 1;

  const north = PROVINCES.filter((p) => p.region === 'Bắc');
  const central = PROVINCES.filter((p) => p.region === 'Trung');
  const south = PROVINCES.filter((p) => p.region === 'Nam');

  // Fetch 100% REAL live companies directly from upstream in real time
  const data = await fetchLiveNationwideCompanies(currentPage, 25);

  const startCount = (data.page - 1) * data.pageSize + 1;
  // Trang nguồn không công bố tổng số doanh nghiệp, nên đếm theo số bản ghi
  // thực sự có trên trang này thay vì theo một tổng số bịa ra.
  const endCount = data.total > 0
    ? Math.min(data.page * data.pageSize, data.total)
    : startCount + data.companies.length - 1;

  // Generate page numbers
  const pageNumbers = [];
  const maxButtons = 7;
  let startPage = Math.max(1, data.page - 3);
  const endPage = Math.min(data.totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  for (let p = startPage; p <= endPage; p++) {
    pageNumbers.push(p);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfb]">
      <Header />

      <main className="flex-1">
        <div className="mst-container py-4">
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-500 mb-4 flex items-center space-x-1.5">
            <Link href="/" className="hover:text-blue-600">Tra cứu mã số thuế</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-800 font-semibold">Tỉnh thành phố</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Column (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Province Selector Box */}
              <div className="bg-white border border-gray-200 rounded p-6 shadow-sm">
                <header className="border-b border-gray-200 pb-4 mb-5">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center space-x-2">
                    <MapPin className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <span>Tra cứu mã số thuế theo 63 tỉnh thành phố</span>
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">
                    Chọn tỉnh / thành phố để lọc và tra cứu toàn bộ danh sách doanh nghiệp được cấp mã số thuế
                  </p>
                </header>

                {/* Region Navigation Tabs / Sections */}
                <div className="space-y-6">
                  {/* Miền Bắc */}
                  <div>
                    <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center space-x-2 border-l-4 border-red-500 pl-2">
                      <span>Miền Bắc ({north.length} tỉnh/thành)</span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                      {north.map((p) => (
                        <Link
                          key={p.code}
                          href={`/tra-cuu-ma-so-thue-theo-tinh/${p.slug}`}
                          prefetch={false}
                          className="bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-400 p-2 rounded flex items-center justify-between transition group"
                        >
                          <span className={`group-hover:text-blue-600 truncate ${p.isMajor ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                            {p.name}
                          </span>
                          <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-amber-500 transition flex-shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Miền Trung & Tây Nguyên */}
                  <div>
                    <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center space-x-2 border-l-4 border-amber-500 pl-2">
                      <span>Miền Trung & Tây Nguyên ({central.length} tỉnh/thành)</span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                      {central.map((p) => (
                        <Link
                          key={p.code}
                          href={`/tra-cuu-ma-so-thue-theo-tinh/${p.slug}`}
                          prefetch={false}
                          className="bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-400 p-2 rounded flex items-center justify-between transition group"
                        >
                          <span className={`group-hover:text-blue-600 truncate ${p.isMajor ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                            {p.name}
                          </span>
                          <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-amber-500 transition flex-shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Miền Nam */}
                  <div>
                    <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center space-x-2 border-l-4 border-blue-500 pl-2">
                      <span>Miền Nam ({south.length} tỉnh/thành)</span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                      {south.map((p) => (
                        <Link
                          key={p.code}
                          href={`/tra-cuu-ma-so-thue-theo-tinh/${p.slug}`}
                          prefetch={false}
                          className="bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-400 p-2 rounded flex items-center justify-between transition group"
                        >
                          <span className={`group-hover:text-blue-600 truncate ${p.isMajor ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                            {p.name}
                          </span>
                          <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-amber-500 transition flex-shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nationwide Multi-Page Enterprise Listing */}
              <div className="bg-white border border-gray-200 rounded p-6 shadow-sm">
                <div className="border-b border-gray-200 pb-3 mb-5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                      <Flame className="w-5 h-5 text-amber-500" />
                      <span>Danh sách doanh nghiệp mới thành lập trên cả nước</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Hiển thị <strong>{startCount} - {endCount}</strong> doanh nghiệp mới nhất (Trang {data.page}/{data.totalPages}) &bull; Dữ liệu trực tuyến cập nhật theo thời gian thực
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2.5 py-1 rounded text-xs flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dữ liệu trực tuyến</span>
                    </span>
                    <span className="bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded text-xs">
                      Trang {data.page}/{data.totalPages}
                    </span>
                  </div>
                </div>

                {/* Companies List */}
                <div className="space-y-3">
                  {data.companies.map((comp, idx) => {
                    const detailSlug = getCompanySlug(comp.id, comp.name);
                    const tone = getCompanyStatusTone(comp.status);
                    const StatusIcon = tone === 'active' ? CheckCircle2 : AlertTriangle;
                    const establishedDate = formatEstablishedDate(comp.startDate || comp.registrationDate);

                    return (
                      <article
                        key={`${comp.id}-${idx}`}
                        className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start sm:items-center space-x-4 flex-1 min-w-0">
                          {/* Enterprise Icon Box */}
                          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-slate-50/90 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-102 transition-transform shadow-2xs">
                            <Building2 className="w-9 h-9 text-slate-400 stroke-[1.5]" />
                          </div>

                          {/* Info Content */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              <Link href={`/${detailSlug}`}>{comp.name}</Link>
                            </h3>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                              <span className="flex items-center space-x-1 text-slate-600">
                                <span className="text-[#e91a2c] font-black font-mono">#</span>
                                <span>Mã số thuế:</span>
                                <Link
                                  href={`/${detailSlug}`}
                                  className="font-mono font-bold text-[#c51322] bg-red-50 border border-red-100 px-2 py-0.5 rounded-md text-xs hover:bg-red-100 transition-colors whitespace-nowrap inline-block"
                                >
                                  {normalizeTaxId(comp.id)}
                                </Link>
                              </span>

                              {comp.representative && (
                                <span className="flex items-center space-x-1 text-slate-600">
                                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>Người đại diện:</span>
                                  <span className="font-bold text-slate-900 uppercase">{comp.representative}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-start space-x-1 text-xs text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <address className="not-italic truncate">{comp.address}</address>
                            </div>

                            <div className="pt-0.5 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center space-x-1 border font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${getCompanyStatusBadgeClass(comp.status)}`}
                              >
                                <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                                <span>{comp.status || 'Chưa rõ trạng thái'}</span>
                              </span>

                              {establishedDate && (
                                <span className="inline-flex items-center space-x-1 bg-slate-50 text-slate-600 border border-slate-200 font-medium px-2.5 py-0.5 rounded-full text-[11px]">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>
                                    Thành lập:{' '}
                                    <strong className="font-semibold text-slate-800">{establishedDate}</strong>
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* View profile button */}
                        <Link
                          href={`/${detailSlug}`}
                          className="self-end md:self-center shrink-0 bg-red-50/90 hover:bg-red-100 active:bg-red-200/80 text-[#c51322] font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center space-x-1"
                        >
                          <span>Xem chi tiết hồ sơ thuế</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#e91a2c]" />
                        </Link>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {data.totalPages > 1 && (
                  <div className="mt-8 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="text-gray-500">
                      Trang {data.page} trên tổng số {data.totalPages} trang
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* First Page */}
                      {data.page > 1 && (
                        <Link
                          href={`/tra-cuu-ma-so-thue-theo-tinh?page=1`}
                          className="p-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                          title="Trang đầu"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </Link>
                      )}

                      {/* Previous Page */}
                      {data.page > 1 && (
                        <Link
                          href={`/tra-cuu-ma-so-thue-theo-tinh?page=${data.page - 1}`}
                          className="px-2.5 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition flex items-center space-x-1"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Trước</span>
                        </Link>
                      )}

                      {/* Page Numbers */}
                      {pageNumbers.map((pNum) => (
                        <Link
                          key={pNum}
                          href={`/tra-cuu-ma-so-thue-theo-tinh?page=${pNum}`}
                          className={`w-7 h-7 flex items-center justify-center rounded font-semibold transition ${
                            pNum === data.page
                              ? 'bg-[#fed700] text-gray-900 border border-amber-400 font-bold shadow-sm'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pNum}
                        </Link>
                      ))}

                      {/* Next Page */}
                      {data.page < data.totalPages && (
                        <Link
                          href={`/tra-cuu-ma-so-thue-theo-tinh?page=${data.page + 1}`}
                          className="px-2.5 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition flex items-center space-x-1"
                        >
                          <span>Sau</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}

                      {/* Last Page */}
                      {data.page < data.totalPages && (
                        <Link
                          href={`/tra-cuu-ma-so-thue-theo-tinh?page=${data.totalPages}`}
                          className="p-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                          title="Trang cuối"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar (4 Cols) */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Highlight Provinces Box */}
              <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                <h3 className="font-bold text-sm text-gray-900 border-b border-gray-200 pb-2 mb-3">
                  Tỉnh / Thành phố trọng điểm
                </h3>
                <div className="space-y-1.5 text-xs">
                  {PROVINCES.filter(p => p.isMajor).map((p) => (
                    <Link
                      key={p.code}
                      href={`/tra-cuu-ma-so-thue-theo-tinh/${p.slug}`}
                      prefetch={false}
                      className="p-2 rounded flex items-center justify-between transition hover:bg-amber-50 hover:text-blue-600 border border-transparent hover:border-amber-200"
                    >
                      <span className="font-semibold text-gray-800">{p.name}</span>
                      <span className="text-[11px] text-gray-400 group-hover:text-amber-600 flex items-center">
                        Xem danh sách <ChevronRight className="w-3 h-3 ml-0.5" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Verified Badge */}
              <div className="bg-green-50 border border-green-200 rounded p-4 text-xs text-green-800">
                <div className="flex items-center space-x-2 font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>Dữ liệu xác thực từ Cục Thuế</span>
                </div>
                <p className="text-[11px] text-green-700 leading-relaxed">
                  Cơ sở dữ liệu được đồng bộ từ Tổng cục Thuế và Cổng thông tin Quốc gia về Đăng ký doanh nghiệp.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
