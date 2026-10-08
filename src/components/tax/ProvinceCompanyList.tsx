'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BusinessTaxInfo } from '@/types/tax';
import { getCompanySlug, normalizeTaxId, formatEstablishedDate, getCompanyStatusBadgeClass, getCompanyStatusTone } from '@/lib/constants';
import {
  MapPin,
  ShieldCheck,
  Hash,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  CheckCircle2,
  Loader2,
  Calendar,
  AlertTriangle,
  FileText,
  LayoutGrid
} from 'lucide-react';

interface Props {
  initialCompanies: BusinessTaxInfo[];
  provinceSlug: string;
  provinceName: string;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  source?: string;
}

const SIDEBAR_PROVINCES = [
  { name: 'Hà Nội', slug: 'ha-noi-7', code: '01' },
  { name: 'Hồ Chí Minh', slug: 'ho-chi-minh-23', code: '79' },
  { name: 'Đà Nẵng', slug: 'da-nang-35', code: '48' },
  { name: 'Hải Phòng', slug: 'hai-phong-99', code: '31' },
  { name: 'Cần Thơ', slug: 'can-tho-96', code: '92' },
  { name: 'Bình Dương', slug: 'binh-duong-17', code: '74' },
  { name: 'Đồng Nai', slug: 'dong-nai-57', code: '75' },
  { name: 'Bà Rịa - Vũng Tàu', slug: 'ba-ria-vung-tau-32', code: '77' },
  { name: 'An Giang', slug: 'an-giang-93', code: '89' },
  { name: 'Bắc Giang', slug: 'bac-giang-72', code: '24' },
  { name: 'Bắc Kạn', slug: 'bac-kan-1127', code: '06' },
  { name: 'Bạc Liêu', slug: 'bac-lieu-197', code: '95' },
  { name: 'Bắc Ninh', slug: 'bac-ninh-170', code: '27' },
  { name: 'Bến Tre', slug: 'ben-tre-185', code: '83' },
  { name: 'Bình Định', slug: 'binh-dinh-152', code: '52' },
  { name: 'Bình Phước', slug: 'binh-phuoc-1', code: '70' },
];


export function ProvinceCompanyList({
  initialCompanies,
  provinceSlug,
  provinceName,
  total: initialTotal,
  page: initialPage,
  pageSize: initialPageSize,
  totalPages: initialTotalPages,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [companies, setCompanies] = useState<BusinessTaxInfo[]>(initialCompanies);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Sync state when props change
  useEffect(() => {
    setCompanies(initialCompanies);
    setTotal(initialTotal);
    setPage(initialPage);
    setTotalPages(initialTotalPages);
  }, [initialCompanies, initialTotal, initialPage, initialTotalPages]);

  // Client-side API search / filter with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/tax/companies?province=${encodeURIComponent(provinceSlug)}&page=1&limit=25&q=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          const json = await res.json();
          setCompanies(json.data || []);
          setTotal(json.total || 0);
          setPage(1);
          setTotalPages(json.totalPages || 1);
        }
      } catch (err) {
        console.error('API search error:', err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, provinceSlug]);

  const handleResetSearch = () => {
    setSearchQuery('');
    setCompanies(initialCompanies);
    setTotal(initialTotal);
    setPage(initialPage);
    setTotalPages(initialTotalPages);
  };

  const startCount = (page - 1) * initialPageSize + 1;
  const endCount = total > 0 ? Math.min(page * initialPageSize, total) : startCount + companies.length - 1;

  // Generate pagination buttons (up to 7)
  const pageNumbers = [];
  const maxButtons = 7;
  let startPage = Math.max(1, page - 3);
  const endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  for (let p = startPage; p <= endPage; p++) {
    pageNumbers.push(p);
  }

  const navigateToPage = (targetPage: number) => {
    setLoading(true);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', targetPage.toString());
      router.push(`/tra-cuu-ma-so-thue-theo-tinh/${provinceSlug}?${params.toString()}`);
    });
  };

  return (
    <div>
      {/* 1. TOP PANORAMIC HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#eef6ff] via-[#f6f9fc] to-[#eaf2fb] border-b border-slate-200/80">
        <div className="mst-container relative py-6 sm:py-8">
          {/* Panoramic Skyline on the right */}
          <div className="absolute right-0 top-0 bottom-0 w-2/5 md:w-[48%] pointer-events-none hidden md:block overflow-hidden">
            {/* Soft gradient edge blend on left of skyline without washing out buildings */}
            <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#eef6ff] via-[#eef6ff]/60 to-transparent z-10" />
            <picture>
              <source srcSet="/images/banner-skyline.webp" type="image/webp" />
              <img
                src="/images/banner-skyline-opt.jpg"
                alt=""
                aria-hidden="true"
                width={1024}
                height={342}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-right"
              />
            </picture>
          </div>

          <div className="relative z-20 max-w-2xl lg:max-w-3xl">
            {/* Breadcrumb */}
            <nav className="text-xs text-slate-500 mb-3.5 flex items-center space-x-1.5 font-medium">
              <Link href="/" className="hover:text-blue-600 transition">
                Tra cứu mã số thuế
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <Link href="/tra-cuu-ma-so-thue-theo-tinh" className="hover:text-blue-600 transition">
                Tỉnh thành phố
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-800 font-bold">{provinceName}</span>
            </nav>

            {/* Title with Amber Pin Icon */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-[#fff8eb] border border-[#fed7aa] flex items-center justify-center text-[#f59e0b] shrink-0 mt-0.5 shadow-2xs">
                <MapPin className="w-5 h-5 text-[#f59e0b] stroke-[2]" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-[25px] font-black tracking-tight text-slate-900 leading-[1.25]">
                Tra cứu mã số thuế & Doanh nghiệp mới thành lập<br />
                tại <span className="text-[#e91a2c]">{provinceName}</span>
              </h1>
            </div>

            {/* Counter and Status Badges */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600 mb-4">
              <span>
                {total > 0 ? (
                  <>
                    Hiển thị <strong>{startCount} - {endCount}</strong> / {total.toLocaleString('vi-VN')} doanh nghiệp mới thành lập tại {provinceName}
                  </>
                ) : (
                  <>
                    Doanh nghiệp mới thành lập tại {provinceName} &mdash; <strong>{companies.length}</strong> doanh nghiệp trên trang này
                  </>
                )}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#fef3c7] text-[#b45309] font-bold text-[11px] border border-[#fde68a]">
                Trang {page}
              </span>
            </div>

            {/* Live Filter Search Input */}
            <div className="relative max-w-2xl">
              <div className="relative flex items-center bg-white rounded-xl border border-slate-200/90 shadow-xs focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Tìm nhanh công ty, mã số thuế hoặc người đại diện tại ${provinceName}...`}
                  className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent rounded-xl focus:outline-none font-normal"
                />
                {loading && (
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin absolute right-3.5" />
                )}
                {searchQuery && !loading && (
                  <button
                    onClick={handleResetSearch}
                    className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs absolute right-3.5"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MAIN 2-COLUMN SECTION: COMPANY CARDS + SIDEBAR */}
      <div className="mst-container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Company Cards (8 Cols) */}
          <div className="lg:col-span-8">
            {loading && companies.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span>Đang tải danh sách doanh nghiệp tại {provinceName}...</span>
              </div>
            ) : companies.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
                Không tìm thấy doanh nghiệp phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              <div className="space-y-3">
                {companies.map((comp, idx) => {
                  const detailSlug = getCompanySlug(comp.id, comp.name);
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
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            <Link href={`/${detailSlug}`}>
                              {comp.name}
                            </Link>
                          </h2>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                            <span className="flex items-center space-x-1 text-slate-600">
                              <span className="text-[#e91a2c] font-black font-mono">#</span>
                              <span>Mã số thuế:</span>
                              <Link
                                href={`/${detailSlug}`}
                                className="font-mono font-bold text-[#e91a2c] bg-red-50 border border-red-100 px-2 py-0.5 rounded-md text-xs hover:bg-red-100 transition-colors whitespace-nowrap inline-block"
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
                            {(() => {
                              const tone = getCompanyStatusTone(comp.status);
                              const StatusIcon = tone === 'active' ? CheckCircle2 : AlertTriangle;
                              return (
                                <span
                                  className={`inline-flex items-center space-x-1 border font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${getCompanyStatusBadgeClass(comp.status)}`}
                                >
                                  <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                                  <span>{comp.status || 'Chưa rõ trạng thái'}</span>
                                </span>
                              );
                            })()}

                            {formatEstablishedDate(comp.startDate || comp.registrationDate) && (
                              <span className="inline-flex items-center space-x-1 bg-slate-50 text-slate-600 border border-slate-200 font-medium px-2.5 py-0.5 rounded-full text-[11px]">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>
                                  Thành lập:{' '}
                                  <strong className="font-semibold text-slate-800">
                                    {formatEstablishedDate(comp.startDate || comp.registrationDate)}
                                  </strong>
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* View profile button */}
                      <Link
                        href={`/${detailSlug}`}
                        className="self-end md:self-center shrink-0 bg-red-50/90 hover:bg-red-100 active:bg-red-200/80 text-[#e91a2c] font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center space-x-1"
                      >
                        <span>Xem chi tiết hồ sơ thuế</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#e91a2c]" />
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 font-medium">
                  Trang {page} trên tổng {totalPages} trang
                  {total > 0 && <> (Tổng {total.toLocaleString('vi-VN')} công ty)</>}
                </div>

                <div className="flex items-center space-x-1">
                  {page > 1 && (
                    <button
                      onClick={() => navigateToPage(1)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                      title="Trang đầu"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                  )}

                  {page > 1 && (
                    <button
                      onClick={() => navigateToPage(page - 1)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Trước</span>
                    </button>
                  )}

                  {pageNumbers.map((pNum) => (
                    <button
                      key={pNum}
                      onClick={() => navigateToPage(pNum)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg font-bold transition ${
                        pNum === page
                          ? 'bg-[#e91a2c] text-white shadow-2xs'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}

                  {page < totalPages && (
                    <button
                      onClick={() => navigateToPage(page + 1)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition flex items-center space-x-1"
                    >
                      <span>Sau</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {page < totalPages && (
                    <button
                      onClick={() => navigateToPage(totalPages)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                      title="Trang cuối"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Other Provinces Sidebar (4 Cols) */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Province Lookup Box */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2.5 mb-3 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[#e91a2c]" />
                <span>Tra cứu theo tỉnh / thành phố</span>
              </h3>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {SIDEBAR_PROVINCES.map((p) => {
                  const isActive =
                    p.slug === provinceSlug ||
                    p.name.toLowerCase() === provinceName.toLowerCase() ||
                    provinceSlug.includes(p.slug) ||
                    p.slug.includes(provinceSlug);

                  return (
                    <Link
                      key={p.code}
                      href={`/tra-cuu-ma-so-thue-theo-tinh/${p.slug}`}
                      className={`px-2 py-1.5 rounded-md flex items-center justify-between transition-colors ${
                        isActive
                          ? 'bg-[#fff0f1] text-[#e91a2c] font-bold'
                          : 'text-slate-700 hover:text-[#e91a2c] hover:bg-[#fff0f1]'
                      }`}
                    >
                      <span>{p.name}</span>
                      <ChevronRight className={`w-3 h-3 ${isActive ? 'text-[#e91a2c]' : 'text-slate-400'}`} />
                    </Link>
                  );
                })}
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-center">
                <Link
                  href="/tra-cuu-ma-so-thue-theo-tinh"
                  className="text-xs text-[#e91a2c] hover:text-[#c51322] font-semibold inline-flex items-center space-x-1"
                >
                  <span>Xem toàn bộ 63 tỉnh thành</span>
                </Link>
              </div>
            </div>

            {/* Tax Status Filter Box */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2.5 mb-3 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Trạng thái hoạt động doanh nghiệp</span>
              </h3>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center space-x-2 text-green-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>NNT đang hoạt động (đã được cấp GCN ĐKT)</span>
                </li>
                <li className="flex items-center space-x-2 text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Tạm nghỉ kinh doanh có thời hạn</span>
                </li>
                <li className="flex items-center space-x-2 text-red-700">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>Ngừng hoạt động nhưng chưa hoàn thành thủ tục đóng MST</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  <span>Ngừng hoạt động và đã đóng MST</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
