'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { ScrollProgressBar, RouteScrollToTop } from '@/components/common/ScrollEnhancements';

interface HeaderProps {
  initialQuery?: string;
  initialType?: string;
  onSearch?: (query: string, type: string) => void;
  [key: string]: unknown;
}

export function Header(_props?: HeaderProps) {
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

  return (
    <>
      <RouteScrollToTop />
      <ScrollProgressBar />
      <header
        className={`w-full sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/92 backdrop-blur-md shadow-sm border-b border-slate-200/90 py-2.5'
            : 'bg-white border-b border-slate-200 py-3.5'
        }`}
      >
        {/* Main Branding Header */}
        <div className="mst-container">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Link href="/" onClick={handleNavClick} className="inline-flex items-center space-x-2.5 group">
                <Image
                  src="/logo.png"
                  alt="Tìm Kiếm Công Ty"
                  width={38}
                  height={38}
                  className="w-[38px] h-[38px] rounded-xl shadow-xs group-hover:scale-105 transition-transform duration-200 object-contain shrink-0"
                  priority
                />
                <div className="flex flex-col">
                  <span className="text-xl sm:text-[22px] font-black tracking-tight text-slate-900 leading-none">
                    TÌM KIẾM <span className="text-[#e91a2c]">CÔNG TY</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase font-mono mt-0.5">
                    timkiemcongty.com
                  </span>
                </div>
              </Link>
            </div>

            {/* Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-7 text-[13.5px] font-medium text-slate-700">
              <Link href="/" onClick={handleNavClick} className="hover:text-[#e91a2c] transition-colors">
                Trang chủ
              </Link>
              <Link href="/tra-cuu-ma-so-thue-theo-nganh-nghe/" onClick={handleNavClick} className="hover:text-[#e91a2c] transition-colors">
                Ngành nghề kinh doanh
              </Link>
              <Link href="/tra-cuu-ma-so-thue-theo-tinh/" onClick={handleNavClick} className="hover:text-[#e91a2c] transition-colors">
                Tỉnh / Thành phố
              </Link>
              <Link href="/lien-he/" onClick={handleNavClick} className="hover:text-[#e91a2c] transition-colors">
                Liên hệ
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md focus:outline-none cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-3 pt-3 border-t border-slate-200 flex flex-col space-y-2 text-sm text-slate-700">
              <Link href="/" className="py-1 hover:text-[#e91a2c] transition-colors" onClick={handleMobileNavClick}>
                Trang chủ
              </Link>
              <Link href="/tra-cuu-ma-so-thue-theo-nganh-nghe/" className="py-1 hover:text-[#e91a2c] transition-colors" onClick={handleMobileNavClick}>
                Ngành nghề kinh doanh
              </Link>
              <Link href="/tra-cuu-ma-so-thue-theo-tinh/" className="py-1 hover:text-[#e91a2c] transition-colors" onClick={handleMobileNavClick}>
                Tỉnh / Thành phố
              </Link>
              <Link href="/lien-he/" className="py-1 hover:text-[#e91a2c] transition-colors" onClick={handleMobileNavClick}>
                Liên hệ
              </Link>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
