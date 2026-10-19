'use client';

import React, { useState } from 'react';
import { BusinessTaxInfo } from '@/types/tax';
import { CompanyCard } from '@/components/tax/CompanyCard';
import { AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface TaxSearchResultsProps {
  results: BusinessTaxInfo[];
  isLoading: boolean;
  searchQuery: string;
  source?: string;
  disclaimer?: string;
  onClear?: () => void;
}

const PAGE_SIZE = 25;

export function TaxSearchResults({
  results,
  isLoading,
  searchQuery,
  source,
  disclaimer,
  onClear
}: TaxSearchResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Reset pagination page when new query or result set arrives
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, results]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedResults = results.slice(startIndex, startIndex + PAGE_SIZE);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 my-6 text-center shadow-xs">
        <div className="flex justify-center items-center space-x-3 text-[#e91a2c] font-semibold mb-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Đang truy vấn trực tiếp từ cơ sở dữ liệu Thuế...</span>
        </div>
        <p className="text-xs text-slate-500">
          Đang kết nối để lấy thông tin mới nhất cho: <strong className="text-slate-800 font-mono">{searchQuery}</strong>
        </p>
      </div>
    );
  }

  if (!searchQuery) {
    return null;
  }

  return (
    <div ref={containerRef} className="bg-white border border-slate-200/90 rounded-xl p-6 my-6 shadow-xs scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 mb-5 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-base text-slate-900">
            Kết quả tra cứu cho: <span className="text-sky-700 font-mono">{searchQuery}</span>
          </span>
          <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-medium border border-slate-200">
            {results.length} kết quả
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-slate-500 font-medium">
              (Trang {safePage} / {totalPages} • Hiển thị {paginatedResults.length} doanh nghiệp)
            </span>
          )}
        </div>

        {source === 'vietqr-live-gdt' && (
          <div className="flex items-center text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
            <strong>Live Data (Tổng cục Thuế)</strong>
          </div>
        )}

        {onClear && (
          <button
            onClick={onClear}
            className="text-xs text-slate-500 hover:text-slate-800 underline ml-auto cursor-pointer"
          >
            Đóng kết quả
          </button>
        )}
      </div>

      {disclaimer && (
        <div className="mb-4 text-xs bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-md flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span>{disclaimer}</span>
        </div>
      )}

      {results.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm font-semibold mb-1 text-slate-700">Không tìm thấy mã số thuế hoặc doanh nghiệp phù hợp</p>
          <p className="text-xs text-slate-400">
            Gợi ý: Kiểm tra lại mã số thuế (10 hoặc 13 chữ số) hoặc tìm theo tên viết tắt của doanh nghiệp.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            {paginatedResults.map((comp, idx) => (
              <CompanyCard key={`${comp.id}-${idx}`} company={comp} prefetch={false} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-500">
                Hiển thị <strong>{startIndex + 1} - {Math.min(startIndex + PAGE_SIZE, results.length)}</strong> trong số <strong>{results.length}</strong> doanh nghiệp
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(safePage - 1)}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer font-medium text-slate-700"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Trang trước</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prev && p - prev > 1 && <span className="px-1.5 text-slate-400">...</span>}
                        <button
                          onClick={() => handlePageChange(p)}
                          className={`w-8 h-8 rounded-md border text-xs font-semibold cursor-pointer transition-colors ${
                            p === safePage
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                              : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  onClick={() => handlePageChange(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer font-medium text-slate-700"
                >
                  <span>Trang sau</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
