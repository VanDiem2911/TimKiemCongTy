'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BusinessTaxInfo } from '@/types/tax';
import { getCompanySlug, getCompanyStatusBadgeClass } from '@/lib/constants';
import {
  MapPin,
  Hash,
  User,
  Building,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  CheckCircle2,
  Loader2
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

export function ProvinceCompanyList({
  initialCompanies,
  provinceSlug,
  provinceName,
  total: initialTotal,
  page: initialPage,
  pageSize: initialPageSize,
  totalPages: initialTotalPages,
  source: initialSource
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [companies, setCompanies] = useState<BusinessTaxInfo[]>(initialCompanies);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [source, setSource] = useState(initialSource || 'live-tax-api');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Sync state when props change
  useEffect(() => {
    setCompanies(initialCompanies);
    setTotal(initialTotal);
    setPage(initialPage);
    setTotalPages(initialTotalPages);
    setSource(initialSource || 'live-tax-api');
  }, [initialCompanies, initialTotal, initialPage, initialTotalPages, initialSource]);

  // Client-side API search / filter with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tax/companies?province=${provinceSlug}&page=1&limit=25&q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const json = await res.json();
          setCompanies(json.data);
          setTotal(json.total);
          setPage(1);
          setTotalPages(json.totalPages);
          if (json.source) setSource(json.source);
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
  const endCount = Math.min(page * initialPageSize, total);

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
      {/* Header and API Info Badge */}
      <header className="border-b border-gray-200 pb-3 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <span>Tra cứu mã số thuế và danh sách công ty tại {provinceName}</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 mt-2 gap-2">
          <p>
            {total > 0 ? (
              <>Hiển thị <strong>{startCount} - {endCount}</strong> doanh nghiệp tại {provinceName}</>
            ) : (
              <>Danh sách doanh nghiệp mới nhất tại {provinceName}</>
            )}
          </p>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 bg-green-50 text-green-700 border border-green-200 font-semibold px-2 py-0.5 rounded text-[11px]">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>{source === 'live-upstream-api' ? 'Dữ liệu trực tuyến' : 'Dữ liệu Thuế Quốc gia'}</span>
            </span>
            <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded text-[11px]">
              Trang {page}
            </span>
          </div>
        </div>

        {/* Live Filter Search Input */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Tìm nhanh công ty, mã số thuế hoặc người đại diện tại ${provinceName}...`}
            className="w-full pl-9 pr-10 py-2 text-xs border border-gray-300 rounded bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
          />
          {loading && (
            <Loader2 className="w-4 h-4 text-amber-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
          {searchQuery && !loading && (
            <button
              onClick={handleResetSearch}
              className="text-xs text-gray-400 hover:text-gray-600 absolute right-3 top-1/2 -translate-y-1/2"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Companies List */}
      {loading && companies.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-xs flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          <span>Đang gọi API tải danh sách doanh nghiệp...</span>
        </div>
      ) : companies.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-xs">
          Không tìm thấy doanh nghiệp phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {companies.map((comp, idx) => {
            const detailSlug = getCompanySlug(comp.id, comp.name);
            return (
              <article key={`${comp.id}-${idx}`} className="py-4 first:pt-0">
                <h2 className="text-base font-bold text-blue-700 hover:underline mb-1">
                  <Link href={`/${detailSlug}`} prefetch={false}>
                    {comp.name}
                  </Link>
                </h2>

                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center space-x-1 text-gray-700">
                      <Hash className="w-3.5 h-3.5 text-gray-400" />
                      <span>Mã số thuế:</span>
                      <Link href={`/${detailSlug}`} prefetch={false} className="font-mono font-bold text-amber-700 hover:underline">
                        {comp.id}
                      </Link>
                    </span>

                    {comp.representative && (
                      <span className="flex items-center space-x-1">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>Người đại diện:</span>
                        <span className="font-semibold text-gray-800">{comp.representative}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-start space-x-1 text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <address className="not-italic">{comp.address}</address>
                  </div>

                  {comp.industryName && (
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Building className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>Ngành nghề: {comp.industryName}</span>
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between">
                    <span
                      className={`inline-block text-[11px] px-2 py-0.5 rounded font-medium border ${getCompanyStatusBadgeClass(comp.status)}`}
                    >
                      {comp.status || 'NNT đang hoạt động'}
                    </span>

                    <Link
                      href={`/${detailSlug}`}
                      prefetch={false}
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      Xem hồ sơ thuế đầy đủ →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-gray-500">
            Trang {page} trên tổng {totalPages} trang (Tổng {total} công ty)
          </div>

          <div className="flex items-center space-x-1">
            {/* First Page */}
            {page > 1 && (
              <button
                onClick={() => navigateToPage(1)}
                className="p-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                title="Trang đầu"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            )}

            {/* Previous Page */}
            {page > 1 && (
              <button
                onClick={() => navigateToPage(page - 1)}
                className="px-2.5 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
            )}

            {/* Page Numbers */}
            {pageNumbers.map((pNum) => (
              <button
                key={pNum}
                onClick={() => navigateToPage(pNum)}
                className={`w-7 h-7 flex items-center justify-center rounded font-semibold transition ${
                  pNum === page
                    ? 'bg-[#fed700] text-gray-900 border border-amber-400 font-bold shadow-sm'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {pNum}
              </button>
            ))}

            {/* Next Page */}
            {page < totalPages && (
              <button
                onClick={() => navigateToPage(page + 1)}
                className="px-2.5 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition flex items-center space-x-1"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Last Page */}
            {page < totalPages && (
              <button
                onClick={() => navigateToPage(totalPages)}
                className="p-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                title="Trang cuối"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
