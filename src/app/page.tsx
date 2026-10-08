'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSlider } from '@/components/home/HeroSlider';
import { TaxSearchResults } from '@/components/tax/TaxSearchResults';
import { ScrollToTopButton } from '@/components/common/ScrollEnhancements';
import { INITIAL_COMPANIES, PROVINCES, getCompanySlug, getCompanyStatusBadgeClass, normalizeTaxId } from '@/lib/constants';
import { BusinessTaxInfo } from '@/types/tax';
import { Hash, MapPin, User, ChevronRight, ShieldCheck } from 'lucide-react';

function HomeContent() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const urlType = searchParams.get('type') || 'auto';

  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [searchType, setSearchType] = useState(urlType);
  const [searchResults, setSearchResults] = useState<BusinessTaxInfo[]>([]);
  const [searchSource, setSearchSource] = useState<string>('');
  const [searchDisclaimer, setSearchDisclaimer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentCompanies, setRecentCompanies] = useState<BusinessTaxInfo[]>(INITIAL_COMPANIES);

  // Load and sync recently looked-up companies in real-time
  const loadRecentLookups = async () => {
    try {
      const res = await fetch('/api/tax/recent');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setRecentCompanies(json.data);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadRecentLookups();
    // Poll every 3 seconds to reflect lookups from any user in real-time
    const interval = setInterval(loadRecentLookups, 3000);
    return () => clearInterval(interval);
  }, []);

  const executeLookup = async (q: string, type: string = 'auto') => {
    if (!q.trim()) return;
    setIsLoading(true);
    setSearchQuery(q);
    setSearchType(type);

    try {
      const res = await fetch(`/api/tax/lookup?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSearchResults(data.data);
        setSearchSource(data.source || '');
        setSearchDisclaimer(data.disclaimer || '');

        // Prepend found company to real-time recent list immediately
        if (data.data.length > 0) {
          const topCompany = data.data[0];
          setRecentCompanies((prev) => {
            const nextList = prev.filter((c) => c.id !== topCompany.id);
            return [{ ...topCompany, lastUpdated: 'Vừa xong' }, ...nextList].slice(0, 30);
          });
        }
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error fetching tax info:', err);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (urlQuery) {
      executeLookup(urlQuery, urlType);
    }
  }, [urlQuery, urlType]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header
        initialQuery={searchQuery}
        initialType={searchType}
        onSearch={(q: string, type: string) => executeLookup(q, type)}
      />

      <main className="flex-1">
        <div className="mst-container py-4">
          {/* Hero Search Box */}
          <HeroSlider
            onSearch={(q, type) => executeLookup(q, type)}
            initialQuery={searchQuery}
            initialType={searchType}
          />

          {/* Real-time Search Result Section (if active) */}
          {(isLoading || searchQuery) && (
            <TaxSearchResults
              results={searchResults}
              isLoading={isLoading}
              searchQuery={searchQuery}
              source={searchSource}
              disclaimer={searchDisclaimer}
              onClear={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
            />
          )}

          {/* Main 2-Column Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6">
            {/* Left Content Area (8 Cols) */}
            <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <div className="border-b border-slate-100 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <span className="w-1.5 h-5 bg-sky-600 inline-block mr-1 rounded-full"></span>
                  Doanh Nghiệp Vừa Được Tra Cứu Gần Đây
                </h2>
              </div>

              {/* Sample Tax Code Search Chips */}
              <div className="mb-5 bg-slate-50 border border-slate-200/80 p-3 rounded-lg text-xs flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-600">Tra cứu nhanh mẫu:</span>
                {[
                  { name: 'Viettel', tax: '0100109106' },
                  { name: 'Vinamilk', tax: '0300588569' },
                  { name: 'IGL Worldwide', tax: '0319732689' },
                  { name: 'Hóa chất Miền Nam', tax: '0301446260' },
                  { name: 'Bao bì Thịnh Thái', tax: '5400575731' }
                ].map((item) => (
                  <button
                    key={item.tax}
                    onClick={() => executeLookup(item.tax, 'enterpriseTax')}
                    className="bg-white border border-slate-200 hover:border-[#e91a2c] hover:bg-[#fff0f1] text-slate-800 px-2.5 py-1 rounded-md transition-all text-xs font-mono cursor-pointer shadow-2xs"
                  >
                    {item.tax} ({item.name})
                  </button>
                ))}
              </div>

              {/* Enterprise Listing - Real-time recently looked-up companies */}
              <div className="divide-y divide-slate-100">
                {recentCompanies.map((company, index) => (
                  <article
                    key={`${company.id}-${index}`}
                    className="py-4 first:pt-0 hover:bg-slate-50/80 px-3 -mx-3 rounded-lg transition-colors duration-150"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 hover:text-[#e91a2c] transition-colors">
                        <Link
                          href={`/${getCompanySlug(company.id, company.name)}`}
                          className="text-left"
                        >
                          {company.name}
                        </Link>
                      </h3>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center space-x-1.5 text-slate-700">
                          <Hash className="w-3.5 h-3.5 text-slate-400" />
                          <span>Mã số thuế:</span>
                          <Link
                            href={`/${getCompanySlug(company.id, company.name)}`}
                            className="font-mono font-bold text-[#e91a2c] bg-[#fff0f1] border border-[#fecdd3] px-1.5 py-0.5 rounded text-xs hover:bg-[#ffe4e6] transition-colors whitespace-nowrap inline-block"
                          >
                            {normalizeTaxId(company.id)}
                          </Link>
                        </span>

                        {company.representative && (
                          <span className="flex items-center space-x-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Người đại diện:</span>
                            <span className="font-semibold text-slate-800">{company.representative}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-start space-x-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <address className="not-italic">{company.address}</address>
                      </div>

                      <div className="pt-1.5 flex items-center justify-between">
                        <span className={`inline-block border text-[11px] px-2.5 py-0.5 rounded-md font-medium ${getCompanyStatusBadgeClass(company.status)}`}>
                          {company.status}
                        </span>

                        <Link
                          href={`/${getCompanySlug(company.id, company.name)}`}
                          className="text-[11px] text-[#e91a2c] hover:text-[#c51322] font-semibold flex items-center space-x-0.5 group"
                        >
                          <span>Xem chi tiết hồ sơ thuế</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Right Sidebar Area (4 Cols) */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Province Lookup Box */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2.5 mb-3 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-[#e91a2c]" />
                  <span>Tra cứu theo tỉnh / thành phố</span>
                </h3>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {PROVINCES.slice(0, 14).map((p) => (
                    <Link
                      key={p.code}
                      href={`/tra-cuu-ma-so-thue-theo-tinh/${p.slug}`}
                      className="text-slate-700 hover:text-[#e91a2c] hover:bg-[#fff0f1] px-2 py-1.5 rounded-md flex items-center justify-between transition-colors"
                    >
                      <span className={p.isMajor ? 'font-semibold text-slate-900' : ''}>{p.name}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </Link>
                  ))}
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-center">
                  <Link
                    href="/tra-cuu-ma-so-thue-theo-tinh/"
                    className="text-xs text-[#e91a2c] hover:text-[#c51322] font-semibold inline-flex items-center space-x-1"
                  >
                    <span>Xem toàn bộ 63 tỉnh thành</span>
                  </Link>
                </div>
              </div>

              {/* Tax Status Filter Box */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2.5 mb-3 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Trạng thái hoạt động doanh nghiệp</span>
                </h3>
                <ul className="space-y-2 text-xs">
                  <li className="flex items-center space-x-2 text-green-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span>NNT đang hoạt động (đã được cấp GCN ĐKT)</span>
                  </li>
                  <li className="flex items-center space-x-2 text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Tạm nghỉ kinh doanh có thời hạn</span>
                  </li>
                  <li className="flex items-center space-x-2 text-red-700">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>Ngừng hoạt động nhưng chưa hoàn thành thủ tục đóng MST</span>
                  </li>
                  <li className="flex items-center space-x-2 text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    <span>Ngừng hoạt động và đã đóng MST</span>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <ScrollToTopButton />
      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm">Đang tải trang chủ Tìm Kiếm Công Ty...</div>}>
      <HomeContent />
    </Suspense>
  );
}
