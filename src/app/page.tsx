'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSlider } from '@/components/home/HeroSlider';
import { TaxSearchResults } from '@/components/tax/TaxSearchResults';
import { INITIAL_COMPANIES, PROVINCES, getCompanySlug, getCompanyStatusBadgeClass } from '@/lib/constants';
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
    <div className="min-h-screen flex flex-col bg-[#fbfbfb]">
      <Header
        initialQuery={searchQuery}
        initialType={searchType}
        onSearch={(q: string, type: string) => executeLookup(q, type)}
      />

      <main className="flex-1">
        <div className="mst-container">
          {/* Hero Search Box (Replaced Slider) */}
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
            <div className="lg:col-span-8 bg-white border border-gray-200 rounded p-5 shadow-sm">
              <div className="border-b border-gray-200 pb-3 mb-5 flex items-center justify-between">
                <h1 className="text-base sm:text-lg font-bold text-gray-800 flex items-center space-x-2">
                  <span className="w-1.5 h-5 bg-[#fed700] inline-block mr-1"></span>
                  Tra Cứu Mã Số Thuế (Công Ty, Doanh Nghiệp Mới)
                </h1>
                <span className="text-xs text-gray-500 hidden sm:inline">
                  Cập nhật theo thời gian thực
                </span>
              </div>

              {/* Sample Tax Code Search Chips */}
              <div className="mb-4 bg-amber-50/60 border border-amber-200 p-2.5 rounded text-xs flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-700">Tra cứu nhanh mẫu:</span>
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
                    className="bg-white border border-amber-300 hover:border-amber-600 hover:bg-amber-100 text-gray-800 px-2 py-1 rounded transition text-xs font-mono"
                  >
                    {item.tax} ({item.name})
                  </button>
                ))}
              </div>

              {/* Enterprise Listing */}
              <div className="divide-y divide-gray-200">
                {INITIAL_COMPANIES.map((company) => (
                  <article key={company.id} className="py-4 first:pt-0">
                    <h2 className="text-sm sm:text-base font-bold text-blue-700 hover:underline mb-1">
                      <Link
                        href={`/${getCompanySlug(company.id, company.name)}`}
                        className="text-left hover:text-amber-600 transition"
                      >
                        {company.name}
                      </Link>
                    </h2>

                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center space-x-1 text-gray-700">
                          <Hash className="w-3.5 h-3.5 text-gray-400" />
                          <span>Mã số thuế:</span>
                          <Link
                            href={`/${getCompanySlug(company.id, company.name)}`}
                            className="font-mono font-bold text-amber-700 hover:underline"
                          >
                            {company.id}
                          </Link>
                        </span>

                        {company.representative && (
                          <span className="flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>Người đại diện:</span>
                            <span className="font-semibold text-gray-800">{company.representative}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-start space-x-1 text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <address className="not-italic">{company.address}</address>
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <span className={`inline-block border text-[11px] px-2 py-0.5 rounded font-medium ${getCompanyStatusBadgeClass(company.status)}`}>
                          {company.status}
                        </span>

                        <Link
                          href={`/${getCompanySlug(company.id, company.name)}`}
                          className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center space-x-0.5"
                        >
                          <span>Xem chi tiết mã số thuế</span>
                          <span>→</span>
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
              <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                <h3 className="font-bold text-sm text-gray-900 border-b border-gray-200 pb-2 mb-3 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  <span>Tra cứu theo tỉnh / thành phố</span>
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {PROVINCES.slice(0, 14).map((p) => (
                    <Link
                      key={p.code}
                      href={`/tra-cuu-ma-so-thue-theo-tinh/${p.slug}`}
                      className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 p-1 rounded flex items-center justify-between transition"
                    >
                      <span className={p.isMajor ? 'font-bold text-gray-900' : ''}>{p.name}</span>
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    </Link>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t text-center">
                  <Link
                    href="/tra-cuu-ma-so-thue-theo-tinh/"
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Xem toàn bộ 63 tỉnh thành →
                  </Link>
                </div>
              </div>

              {/* Tax Status Filter Box */}
              <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                <h3 className="font-bold text-sm text-gray-900 border-b border-gray-200 pb-2 mb-3 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>Trạng thái hoạt động doanh nghiệp</span>
                </h3>
                <ul className="space-y-2 text-xs text-gray-700">
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

              {/* Personal Tax Lookup Callout */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-300 rounded p-4 shadow-sm">
                <h4 className="font-bold text-sm text-amber-900 mb-1">
                  Tra cứu MST Cá Nhân bằng CCCD
                </h4>
                <p className="text-xs text-amber-800 mb-3 leading-relaxed">
                  Nhập số Thẻ Căn cước công dân hoặc CMND để kiểm tra mã số thuế thu nhập cá nhân (TNCN) mới nhất.
                </p>
                <Link
                  href="/tra-cuu-ma-so-thue-ca-nhan/"
                  className="block text-center bg-[#fed700] hover:bg-[#e0b200] text-gray-900 font-semibold text-xs py-2 px-3 rounded shadow-sm transition"
                >
                  Đến trang tra cứu cá nhân →
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500 text-sm">Đang tải trang chủ Tìm Kiếm Công Ty...</div>}>
      <HomeContent />
    </Suspense>
  );
}
