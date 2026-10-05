'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, User, Mail, Menu, Search } from 'lucide-react';

interface HeaderProps {
  initialQuery?: string;
  initialType?: string;
  onSearch?: (query: string, type: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function Header(_props?: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full bg-white shadow-sm border-b border-gray-200">
      {/* 1. Top Bar */}
      <div className="bg-[#f5f5f5] border-b border-gray-200 text-xs text-gray-600 hidden md:block">
        <div className="mst-container flex justify-between items-center h-8">
          <div>
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Tìm Kiếm Công Ty - Tra cứu mã số thuế doanh nghiệp & cá nhân toàn quốc
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/tra-cuu-ma-so-thue-theo-tinh/" className="flex items-center space-x-1 hover:text-blue-600">
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              <span>Tỉnh / Thành phố</span>
            </Link>
            <Link href="/tra-cuu-ma-so-thue-ca-nhan/" className="flex items-center space-x-1 hover:text-blue-600">
              <User className="w-3.5 h-3.5 text-gray-500" />
              <span>Tra cứu mã số thuế cá nhân</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Branding Header */}
      <div className="mst-container py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link href="/" className="inline-flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <Search className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-[22px] font-black tracking-tight text-gray-900 leading-none">
                  TÌM KIẾM <span className="text-red-600">CÔNG TY</span>
                </span>
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase font-mono mt-0.5">
                  timkiemcongty.com
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6 text-[14px] font-medium text-gray-700">
            <Link href="/" className="hover:text-amber-600 transition-colors">
              Trang chủ
            </Link>
            <Link href="/tra-cuu-ma-so-thue-ca-nhan/" className="hover:text-amber-600 transition-colors">
              Tra cứu mã số thuế cá nhân
            </Link>
            <Link href="/tra-cuu-ma-so-thue-theo-nganh-nghe/" className="hover:text-amber-600 transition-colors">
              Ngành nghề
            </Link>
            <Link href="/tra-cuu-ma-so-thue-theo-tinh/" className="hover:text-amber-600 transition-colors">
              Tỉnh thành
            </Link>
            <Link href="/lien-he/" className="hover:text-amber-600 transition-colors">
              Liên hệ
            </Link>
          </nav>

          {/* Support Email */}
          <div className="hidden sm:flex items-center text-xs text-gray-600 space-x-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-gray-400">Email hỗ trợ:</div>
              <a href="mailto:support@timkiemcongty.com" className="font-semibold text-gray-700 hover:text-amber-600">
                support@timkiemcongty.com
              </a>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-600 hover:text-black focus:outline-none"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-gray-200 flex flex-col space-y-2 text-sm text-gray-700">
            <Link href="/" className="py-1 hover:text-amber-600" onClick={() => setMobileMenuOpen(false)}>
              Trang chủ
            </Link>
            <Link href="/tra-cuu-ma-so-thue-ca-nhan/" className="py-1 hover:text-amber-600" onClick={() => setMobileMenuOpen(false)}>
              Tra cứu mã số thuế cá nhân
            </Link>
            <Link href="/tra-cuu-ma-so-thue-theo-nganh-nghe/" className="py-1 hover:text-amber-600" onClick={() => setMobileMenuOpen(false)}>
              Ngành nghề kinh doanh
            </Link>
            <Link href="/tra-cuu-ma-so-thue-theo-tinh/" className="py-1 hover:text-amber-600" onClick={() => setMobileMenuOpen(false)}>
              Tỉnh / Thành phố
            </Link>
            <Link href="/lien-he/" className="py-1 hover:text-amber-600" onClick={() => setMobileMenuOpen(false)}>
              Liên hệ
            </Link>
          </div>
        )}
      </div>

    </header>
  );
}
