'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, Hash, User, X } from 'lucide-react';

interface HeroSearchProps {
  onSearch?: (query: string, type: string) => void;
  initialQuery?: string;
  initialType?: string;
}

export function HeroSlider({ onSearch, initialQuery = '', initialType = 'auto' }: HeroSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState(initialType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQ = query.trim();
    if (!cleanQ) return;

    if (onSearch) {
      onSearch(cleanQ, searchType);
    } else {
      router.push(`/?q=${encodeURIComponent(cleanQ)}&type=${encodeURIComponent(searchType)}`);
    }
  };

  const handleQuickSearch = (keyword: string, type = 'auto') => {
    setQuery(keyword);
    setSearchType(type);
    if (onSearch) {
      onSearch(keyword, type);
    } else {
      router.push(`/?q=${encodeURIComponent(keyword)}&type=${encodeURIComponent(type)}`);
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className="relative w-full rounded-b overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white py-8 sm:py-12 px-4 sm:px-8 shadow-lg mb-6">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#fed700_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold mb-3">
          <Building2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Tra cứu thông tin Thuế & Doanh nghiệp chính thức</span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2 leading-tight">
          Tra cứu <span className="text-[#fed700]">Mã số thuế</span> & Tên công ty
        </h1>
        <p className="text-xs sm:text-sm text-gray-300 max-w-2xl mx-auto mb-6">
          Dữ liệu thời gian thực được kết nối trực tiếp với Tổng cục Thuế Việt Nam và Cổng thông tin đăng ký doanh nghiệp quốc gia.
        </p>

        {/* Main Search Form */}
        <form onSubmit={handleSubmit} className="bg-white p-2 sm:p-2.5 rounded-lg shadow-2xl flex flex-col md:flex-row gap-2 border-2 border-amber-400/80">
          {/* Search Type Selector */}
          <div className="flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200 pr-1 pb-1 md:pb-0">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full md:w-auto h-full px-3 py-2 text-xs sm:text-sm text-gray-700 font-semibold bg-gray-50 hover:bg-gray-100 rounded focus:outline-none cursor-pointer"
            >
              <option value="auto">🔍 Tất cả</option>
              <option value="taxCode"># Mã số thuế</option>
              <option value="companyName">🏢 Tên doanh nghiệp</option>
              <option value="legalName">👤 Người đại diện</option>
            </select>
          </div>

          {/* Search Input Box */}
          <div className="relative flex-1 flex items-center">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập mã số thuế (10 hoặc 13 số), tên công ty hoặc người đại diện..."
              className="w-full pl-10 pr-9 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-900 placeholder-gray-400 rounded focus:outline-none"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                title="Xóa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Submit Search Button */}
          <button
            type="submit"
            className="flex-shrink-0 bg-[#fed700] hover:bg-[#eab308] text-gray-950 font-bold px-6 py-2.5 sm:py-3 rounded transition flex items-center justify-center space-x-2 shadow-sm active:scale-95 text-xs sm:text-sm uppercase tracking-wide cursor-pointer"
          >
            <Search className="w-4 h-4 text-gray-950 font-bold" />
            <span>Tra cứu</span>
          </button>
        </form>

        {/* Quick Search Suggestions */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-300">
          <span className="text-gray-400 font-medium">Gợi ý tra cứu nhanh:</span>
          
          <button
            type="button"
            onClick={() => handleQuickSearch('0300588569', 'taxCode')}
            className="bg-white/10 hover:bg-white/20 text-yellow-300 border border-white/15 px-2.5 py-1 rounded transition flex items-center space-x-1"
          >
            <Hash className="w-3 h-3 text-yellow-400" />
            <span>0300588569 (Vinamilk)</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSearch('0319641544', 'taxCode')}
            className="bg-white/10 hover:bg-white/20 text-yellow-300 border border-white/15 px-2.5 py-1 rounded transition flex items-center space-x-1"
          >
            <Hash className="w-3 h-3 text-yellow-400" />
            <span>0319641544 (DUDI)</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSearch('0100112437', 'taxCode')}
            className="bg-white/10 hover:bg-white/20 text-blue-200 border border-white/15 px-2.5 py-1 rounded transition flex items-center space-x-1"
          >
            <Building2 className="w-3 h-3 text-blue-300" />
            <span>Vietcombank</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSearch('0101248141', 'taxCode')}
            className="bg-white/10 hover:bg-white/20 text-emerald-200 border border-white/15 px-2.5 py-1 rounded transition flex items-center space-x-1"
          >
            <Building2 className="w-3 h-3 text-emerald-300" />
            <span>Tập đoàn FPT</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSearch('Mai Kiều Liên', 'legalName')}
            className="bg-white/10 hover:bg-white/20 text-purple-200 border border-white/15 px-2.5 py-1 rounded transition flex items-center space-x-1"
          >
            <User className="w-3 h-3 text-purple-300" />
            <span>Mai Kiều Liên</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const HeroSearch = HeroSlider;
