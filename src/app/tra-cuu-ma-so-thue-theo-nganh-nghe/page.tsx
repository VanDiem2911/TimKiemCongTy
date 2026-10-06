'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { INDUSTRIES } from '@/lib/constants';
import { Briefcase, Search, ChevronRight, ChevronLeft } from 'lucide-react';

const PAGE_SIZE = 50;

export default function IndustryTaxPage() {
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredIndustries = useMemo(() => {
    const norm = filterText.toLowerCase().trim();
    if (!norm) return INDUSTRIES;
    return INDUSTRIES.filter((item) => {
      return item.code.includes(norm) || item.name.toLowerCase().includes(norm);
    });
  }, [filterText]);

  // Reset to page 1 when search text changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredIndustries.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedIndustries = filteredIndustries.slice(startIndex, startIndex + PAGE_SIZE);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfb]">
      <Header />

      <main className="flex-1">
        <div className="mst-container py-4">
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-500 mb-4 flex items-center space-x-1.5">
            <Link href="/" className="hover:text-blue-600">Tra cứu mã số thuế</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-800 font-semibold">Ngành nghề</span>
          </nav>

          <div className="bg-white border border-gray-200 rounded p-6 shadow-sm">
            <div className="border-b border-gray-200 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <Briefcase className="w-5 h-5 text-amber-500" />
                  <span>Tra cứu mã số thuế theo ngành nghề kinh doanh</span>
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Đầy đủ {INDUSTRIES.length} mã ngành kinh tế Việt Nam (VSIC cấp 2, 3, 4) áp dụng trong đăng ký doanh nghiệp
                </p>
              </div>

              {/* Fast Filter by Code or Name */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filterText}
                  onChange={handleFilterChange}
                  placeholder="Nhập mã ngành (VD: 7310) hoặc tên ngành..."
                  aria-label="Lọc theo mã ngành hoặc tên ngành"
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Results Counter */}
            <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 mb-3 gap-2">
              <span>
                Tìm thấy <strong>{filteredIndustries.length}</strong> mã ngành nghề
                {filterText ? ` phù hợp với "${filterText}"` : ''}
              </span>
              <span>
                Trang <strong>{safePage}</strong> / {totalPages} (Hiển thị {paginatedIndustries.length} ngành)
              </span>
            </div>

            {/* Industry Table */}
            <div className="overflow-x-auto">
              <table className="mst-table">
                <thead>
                  <tr className="bg-gray-100 text-xs font-bold text-gray-700">
                    <th className="w-24">Mã ngành</th>
                    <th>Tên ngành nghề kinh doanh</th>
                    <th className="w-32 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs">
                  {paginatedIndustries.map((ind) => (
                    <tr key={ind.code} className="hover:bg-amber-50/50 transition">
                      <td className="font-mono font-bold text-blue-700">
                        <Link href={`/?q=${encodeURIComponent(ind.code)}&type=industry`} className="hover:underline">
                          {ind.code}
                        </Link>
                      </td>
                      <td className="text-gray-800 font-medium">{ind.name}</td>
                      <td className="text-right">
                        <Link
                          href={`/?q=${encodeURIComponent(ind.code)}&type=industry`}
                          className="inline-block bg-gray-100 hover:bg-amber-400 text-gray-800 hover:text-black px-2.5 py-1 rounded text-[11px] font-semibold transition"
                        >
                          Tra cứu DN →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredIndustries.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-500">
                  Không tìm thấy ngành nghề nào phù hợp với từ khóa &quot;{filterText}&quot;.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-center gap-1 text-xs">
                <button
                  onClick={() => handlePageChange(safePage - 1)}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer"
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
                        {prev && p - prev > 1 && <span className="px-2 text-gray-400">...</span>}
                        <button
                          onClick={() => handlePageChange(p)}
                          className={`w-8 h-8 rounded border text-xs font-semibold cursor-pointer ${
                            p === safePage
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'border-gray-300 hover:bg-gray-50 text-gray-700'
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
                  className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer"
                >
                  <span>Trang sau</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
