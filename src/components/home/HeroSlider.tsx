'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, Landmark, User, X } from 'lucide-react';

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
      router.push(`/?q=${encodeURIComponent(keyword)}&type=${encodeURIComponent(searchType)}`);
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-sm border border-slate-200/90 py-10 sm:py-14 md:py-16 px-4 sm:px-8 mb-8">
      {/* Ảnh nền đặt bằng thẻ img thay vì background-image của CSS để trình duyệt
          phát hiện và tải sớm - đây là phần tử quyết định chỉ số LCP của trang. */}
      <picture>
        <source media="(max-width: 640px)" srcSet="/images/banner-skyline-640.webp" type="image/webp" />
        <source srcSet="/images/banner-skyline.webp" type="image/webp" />
        <img
          src="/images/banner-skyline-opt.jpg"
          alt=""
          aria-hidden="true"
          width={1024}
          height={342}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 40%' }}
        />
      </picture>
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Main Heading */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight mb-2.5 leading-tight drop-shadow-xs">
          Tra cứu <span className="text-[#e91a2c]">Mã số thuế</span> & Tên công ty
        </h1>
        <p className="text-xs sm:text-sm md:text-[15px] text-slate-800 max-w-2xl mx-auto mb-6 sm:mb-7 font-semibold drop-shadow-xs">
          Dữ liệu kết nối trực tiếp với Tổng cục Thuế Việt Nam và Cổng thông tin đăng ký doanh nghiệp quốc gia.
        </p>

        {/* Main Search Bar Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-2 sm:p-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-2 border border-slate-200/90 focus-within:border-[#e91a2c] focus-within:ring-2 focus-within:ring-[#e91a2c]/20 transition-all duration-200"
        >
          {/* Search Type Selector */}
          <div className="w-full sm:w-auto flex-shrink-0 sm:border-r border-slate-200 px-3 py-1 flex items-center justify-between sm:justify-start">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full sm:w-auto text-xs sm:text-sm text-slate-700 font-semibold bg-transparent focus:outline-none cursor-pointer pr-1 py-1"
            >
              <option value="auto">Tất cả thông tin</option>
              <option value="taxCode">Mã số thuế</option>
              <option value="companyName">Tên doanh nghiệp</option>
              <option value="legalName">Người đại diện</option>
              <option value="industry">Mã ngành kinh doanh</option>
            </select>
          </div>

          {/* Search Input Box */}
          <div className="relative flex-1 w-full flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập mã số thuế (10 hoặc 13 số), tên công ty hoặc người đại diện..."
              className="w-full pl-9 pr-9 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                title="Xóa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Submit Search Button */}
          <button
            type="submit"
            className="w-full sm:w-auto flex-shrink-0 bg-[#e91a2c] hover:bg-[#d01525] active:bg-[#a80f1b] text-white font-bold px-6 sm:px-7 py-2.5 sm:py-3 rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5 shadow-md hover:shadow-lg active:scale-95 text-xs sm:text-sm tracking-wide cursor-pointer"
          >
            <Search className="w-4 h-4 text-white stroke-[2.5]" />
            <span>Tra cứu</span>
          </button>
        </form>

        {/* Quick Search Suggestions */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600">
          <span className="font-medium text-slate-700">Gợi ý tra cứu nhanh:</span>

          <button
            type="button"
            onClick={() => handleQuickSearch('0300588569', 'taxCode')}
            className="bg-white/85 hover:bg-white text-slate-800 border border-slate-200/90 hover:border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
          >
            <span className="text-[#e91a2c] font-black font-mono">#</span>
            <span>0300588569 (Vinamilk)</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSearch('Vietcombank', 'companyName')}
            className="bg-white/85 hover:bg-white text-slate-800 border border-slate-200/90 hover:border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5 text-[#e91a2c]" />
            <span>Vietcombank</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSearch('FPT', 'companyName')}
            className="bg-white/85 hover:bg-white text-slate-800 border border-slate-200/90 hover:border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-[#e91a2c]" />
            <span>Tập đoàn FPT</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSearch('Mai Kiều Liên', 'legalName')}
            className="bg-white/85 hover:bg-white text-slate-800 border border-slate-200/90 hover:border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-[#e91a2c]" />
            <span>Mai Kiều Liên</span>
          </button>
        </div>
      </div>
    </div>
  );
}
