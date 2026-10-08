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
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white py-10 sm:py-14 px-4 sm:px-8 shadow-xl mb-8 border border-slate-800/80">
      {/* Background Subtle Tech Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e91a2c_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.08] pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#e91a2c]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#e91a2c]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3 leading-tight">
          Tra cứu <span className="text-[#ff4757]">Mã số thuế</span> & Tên công ty
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto mb-7 font-normal">
          Dữ liệu kết nối trực tiếp với Tổng cục Thuế Việt Nam và Cổng thông tin đăng ký doanh nghiệp quốc gia.
        </p>

        {/* Main Search Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-2 sm:p-2.5 rounded-xl shadow-2xl flex flex-col md:flex-row gap-2 border border-slate-200/90 focus-within:border-[#e91a2c] focus-within:ring-2 focus-within:ring-[#e91a2c]/20 transition-all duration-200"
        >
          {/* Search Type Selector */}
          <div className="flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-200 pr-1 pb-1 md:pb-0">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full md:w-auto h-full px-3 py-2 text-xs sm:text-sm text-slate-700 font-medium bg-slate-50 hover:bg-slate-100 rounded-lg focus:outline-none cursor-pointer transition-colors"
            >
              <option value="auto">Tất cả thông tin</option>
              <option value="taxCode">Mã số thuế</option>
              <option value="companyName">Tên doanh nghiệp</option>
              <option value="legalName">Người đại diện</option>
              <option value="industry">Mã ngành kinh doanh</option>
            </select>
          </div>

          {/* Search Input Box */}
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập mã số thuế (10 hoặc 13 số), tên công ty hoặc người đại diện..."
              className="w-full pl-9 pr-9 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 placeholder-slate-400 rounded-lg focus:outline-none"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                title="Xóa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Submit Search Button */}
          <button
            type="submit"
            className="flex-shrink-0 bg-[#e91a2c] hover:bg-[#c51322] active:bg-[#a80f1b] text-white font-semibold px-6 py-2.5 sm:py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm hover:shadow active:scale-95 text-xs sm:text-sm tracking-wide cursor-pointer"
          >
            <Search className="w-4 h-4 text-white" />
            <span>Tra cứu</span>
          </button>
        </form>

        {/* Quick Search Suggestions */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-400">Gợi ý tra cứu nhanh:</span>

          <button
            type="button"
            onClick={() => handleQuickSearch('0300588569', 'taxCode')}
            className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 px-2.5 py-1 rounded-md transition flex items-center space-x-1 cursor-pointer"
          >
            <Hash className="w-3 h-3 text-[#ff4757]" />
            <span>0300588569 (Vinamilk)</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleQuickSearch('0100112437', 'taxCode')}
            className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 px-2.5 py-1 rounded-md transition flex items-center space-x-1 cursor-pointer"
          >
            <Building2 className="w-3 h-3 text-[#ff4757]" />
            <span>Vietcombank</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSearch('0101248141', 'taxCode')}
            className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 px-2.5 py-1 rounded-md transition flex items-center space-x-1 cursor-pointer"
          >
            <Building2 className="w-3 h-3 text-[#ff4757]" />
            <span>Tập đoàn FPT</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSearch('Mai Kiều Liên', 'legalName')}
            className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 px-2.5 py-1 rounded-md transition flex items-center space-x-1 cursor-pointer"
          >
            <User className="w-3 h-3 text-[#ff4757]" />
            <span>Mai Kiều Liên</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const HeroSearch = HeroSlider;
