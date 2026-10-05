'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { INDUSTRIES } from '@/lib/constants';
import { Briefcase, Search, ChevronRight } from 'lucide-react';

export default function IndustryTaxPage() {
  const [filterText, setFilterText] = useState('');

  const filteredIndustries = INDUSTRIES.filter((item) => {
    return item.code.includes(filterText);
  });

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
                  Hệ thống ngành kinh tế Việt Nam (VSIC) cấp 4 áp dụng trong đăng ký doanh nghiệp
                </p>
              </div>

              {/* Fast Filter */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập mã ngành..."
                  inputMode="numeric"
                  aria-label="Lọc theo mã ngành"
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
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
                  {filteredIndustries.map((ind) => (
                    <tr key={ind.code} className="hover:bg-amber-50/50 transition">
                      <td className="font-mono font-bold text-blue-700">
                        <Link href={`/?q=${encodeURIComponent(ind.code)}&type=industry`} className="hover:underline">
                          {ind.code}
                        </Link>
                      </td>
                      <td className="text-gray-800">{ind.name}</td>
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
                  Không tìm thấy ngành nghề nào có mã &quot;{filterText}&quot;.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
