'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Home, LayoutGrid, MapPin, Phone, Menu, X } from 'lucide-react';
import { ScrollProgressBar, RouteScrollToTop } from '@/components/common/ScrollEnhancements';

interface HeaderProps {
  initialQuery?: string;
  initialType?: string;
  onSearch?: (query: string, type: string) => void;
  [key: string]: unknown;
}

export function Header(_props?: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleNavClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMobileNavClick = () => {
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      if (scrolled !== isScrolled) {
        setIsScrolled(scrolled);
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isScrolled]);

  const isHome = pathname === '/';
  const isIndustry = pathname?.startsWith('/tra-cuu-ma-so-thue-theo-nganh-nghe');
  const isProvince = pathname?.startsWith('/tra-cuu-ma-so-thue-theo-tinh');
  const isContact = pathname?.startsWith('/lien-he');

  return (
    <>
      <RouteScrollToTop />
      <ScrollProgressBar />
      <header
        className={`w-full sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/90 py-2.5'
            : 'bg-white border-b border-gray-200 py-3.5'
        }`}
      >
        <div className="mst-container">
          <div className="flex items-center justify-between gap-4">
            {/* Logo Brand */}
            <div className="flex items-center space-x-3">
              <Link href="/" onClick={handleNavClick} className="inline-flex items-center space-x-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#dc2626] to-[#ef4444] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200 shrink-0">
                  <Search className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl sm:text-[22px] font-black tracking-tight text-gray-900 leading-none">
                    TÌM KIẾM <span className="text-[#e91a2c]">CÔNG TY</span>
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase font-mono mt-0.5">
                    TIMKIEMCONGTY.COM
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-2 text-[13.5px]">
              <Link
                href="/"
                onClick={handleNavClick}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isHome
                    ? 'bg-[#fff1f2] text-[#e11d48] font-bold border border-[#fecdd3]'
                    : 'text-gray-700 hover:text-[#e91a2c] hover:bg-gray-50 font-medium'
                }`}
              >
                <Home className={`w-4 h-4 ${isHome ? 'text-[#e11d48]' : 'text-gray-500'}`} />
                <span>Trang chủ</span>
              </Link>

              <Link
                href="/tra-cuu-ma-so-thue-theo-nganh-nghe/"
                onClick={handleNavClick}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isIndustry
                    ? 'bg-[#fff1f2] text-[#e11d48] font-bold border border-[#fecdd3]'
                    : 'text-gray-700 hover:text-[#e91a2c] hover:bg-gray-50 font-medium'
                }`}
              >
                <LayoutGrid className={`w-4 h-4 ${isIndustry ? 'text-[#e11d48]' : 'text-gray-500'}`} />
                <span>Ngành nghề kinh doanh</span>
              </Link>

              <Link
                href="/tra-cuu-ma-so-thue-theo-tinh/"
                onClick={handleNavClick}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl transition-all ${
                  isProvince
                    ? 'bg-[#fff1f2] text-[#e11d48] font-bold border border-[#fecdd3]'
                    : 'text-gray-700 hover:text-[#e91a2c] hover:bg-gray-50 font-medium'
                }`}
              >
                <MapPin className={`w-4 h-4 ${isProvince ? 'text-[#e11d48]' : 'text-gray-500'}`} />
                <span>Tỉnh / Thành phố</span>
              </Link>

              <Link
                href="/lien-he/"
                onClick={handleNavClick}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isContact
                    ? 'bg-[#fff1f2] text-[#e11d48] font-bold border border-[#fecdd3]'
                    : 'text-gray-700 hover:text-[#e91a2c] hover:bg-gray-50 font-medium'
                }`}
              >
                <Phone className={`w-4 h-4 ${isContact ? 'text-[#e11d48]' : 'text-gray-500'}`} />
                <span>Liên hệ</span>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-700 hover:text-gray-900 rounded-md focus:outline-none cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-3 pt-3 border-t border-gray-200 flex flex-col space-y-1 text-sm text-gray-700">
              <Link
                href="/"
                className={`py-2 px-3 rounded-lg flex items-center space-x-2 ${
                  isHome ? 'bg-red-50 text-[#c51322] font-bold' : 'hover:bg-gray-50'
                }`}
                onClick={handleMobileNavClick}
              >
                <Home className="w-4 h-4 text-[#e91a2c]" />
                <span>Trang chủ</span>
              </Link>
              <Link
                href="/tra-cuu-ma-so-thue-theo-nganh-nghe/"
                className={`py-2 px-3 rounded-lg flex items-center space-x-2 ${
                  isIndustry ? 'bg-red-50 text-[#c51322] font-bold' : 'hover:bg-gray-50'
                }`}
                onClick={handleMobileNavClick}
              >
                <LayoutGrid className="w-4 h-4 text-gray-500" />
                <span>Ngành nghề kinh doanh</span>
              </Link>
              <Link
                href="/tra-cuu-ma-so-thue-theo-tinh/"
                className={`py-2 px-3 rounded-lg flex items-center space-x-2 ${
                  isProvince ? 'bg-red-50 text-[#c51322] font-bold' : 'hover:bg-gray-50'
                }`}
                onClick={handleMobileNavClick}
              >
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>Tỉnh / Thành phố</span>
              </Link>
              <Link
                href="/lien-he/"
                className={`py-2 px-3 rounded-lg flex items-center space-x-2 ${
                  isContact ? 'bg-red-50 text-[#c51322] font-bold' : 'hover:bg-gray-50'
                }`}
                onClick={handleMobileNavClick}
              >
                <Phone className="w-4 h-4 text-gray-500" />
                <span>Liên hệ</span>
              </Link>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
