'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSlider } from '@/components/home/HeroSlider';
import { TaxSearchResults } from '@/components/tax/TaxSearchResults';
import { ScrollToTopButton } from '@/components/common/ScrollEnhancements';
import { INITIAL_COMPANIES, PROVINCES, getCompanySlug, getCompanyStatusBadgeClass, getCompanyStatusTone, normalizeTaxId, formatEstablishedDate } from '@/lib/constants';
import { BusinessTaxInfo } from '@/types/tax';
import { Hash, MapPin, User, ChevronRight, ShieldCheck, Clock, Building2, CheckCircle2, Calendar, AlertTriangle } from 'lucide-react';


/**
 * Chỉ mỗi thành phần nhỏ này đọc tham số trên URL.
 * Đặt nó trong một Suspense riêng để Next.js vẫn dựng sẵn được HTML của cả
 * trang; nếu dùng useSearchParams ở thành phần cha thì toàn bộ trang mất khả
 * năng dựng sẵn và trình duyệt phải chờ tải JavaScript mới thấy nội dung.
 */
function UrlSearchWatcher({ onSearch }: { onSearch: (q: string, type: string) => void }) {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'auto';
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    if (q) onSearchRef.current(q, type);
  }, [q, type]);

  return null;
}

function HomeContent() {
  // Đọc từ khóa trên URL sau khi trang đã hiện, thay vì dùng useSearchParams.
  // useSearchParams buộc Next.js bỏ qua việc dựng sẵn HTML, khiến máy chủ chỉ
  // trả về dòng "Đang tải" và trình duyệt phải chờ tải xong JavaScript mới thấy
  // nội dung - đó là nguyên nhân chính làm chỉ số LCP cao.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('auto');
  const [searchResults, setSearchResults] = useState<BusinessTaxInfo[]>([]);
  const [searchSource, setSearchSource] = useState<string>('');
  const [searchDisclaimer, setSearchDisclaimer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentCompanies, setRecentCompanies] = useState<BusinessTaxInfo[]>(INITIAL_COMPANIES.slice(0, 10));

  // Load and sync recently looked-up companies in real-time
  const loadRecentLookups = async () => {
    try {
      const res = await fetch('/api/tax/recent');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setRecentCompanies(json.data.slice(0, 10));
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadRecentLookups();

    // Làm mới danh sách tra cứu gần đây theo chu kỳ thưa, và chỉ khi người dùng
    // đang thực sự xem trang - tránh gọi API liên tục ở các tab bị ẩn.
    const refreshIfVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        loadRecentLookups();
      }
    };

    const interval = setInterval(refreshIfVisible, 20000);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
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
            return [{ ...topCompany, lastUpdated: 'Vừa xong' }, ...nextList].slice(0, 10);
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



  return (
    <>
    <Suspense fallback={null}>
      <UrlSearchWatcher onSearch={executeLookup} />
    </Suspense>
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
            <div className="lg:col-span-8 space-y-3.5">
              {/* Header Box: Doanh Nghiệp Vừa Được Tra Cứu Gần Đây */}
              <div className="rounded-2xl bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-blue-100/40 border border-blue-100/90 p-4 sm:p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center space-x-3 mb-3.5">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Clock className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Doanh Nghiệp Vừa Được Tra Cứu <span className="text-blue-600">Gần Đây</span>
                  </h2>
                </div>

                {/* Tra cứu nhanh mẫu */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-slate-700">Tra cứu nhanh mẫu:</span>
                  {[
                    { name: 'Viettel', tax: '0100109106' },
                    { name: 'Vinamilk', tax: '0300588569' },
                    { name: 'IGL Worldwide', tax: '0319732689' },
                    { name: 'Hóa chất Miền Nam', tax: '0301446260' },
                    { name: 'Bao bì Thịnh Thái', tax: '5400575731' }
                  ].map((item) => (
                    <button
                      key={item.tax}
                      type="button"
                      onClick={() => executeLookup(item.tax, 'enterpriseTax')}
                      className="bg-white hover:bg-blue-50/80 text-slate-700 border border-blue-200/80 hover:border-blue-300 px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <span className="text-blue-600 font-bold font-mono">#</span>
                      <span>{item.tax} ({item.name})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Enterprise Listing - Independent Cards */}
              <div className="space-y-3">
                {recentCompanies.slice(0, 10).map((company, index) => (
                  <article
                    key={`${company.id}-${index}`}
                    className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start sm:items-center space-x-4 flex-1 min-w-0">
                      {/* Enterprise Icon Box */}
                      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-slate-50/90 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-102 transition-transform shadow-2xs">
                        <Building2 className="w-9 h-9 text-slate-400 stroke-[1.5]" />
                      </div>

                      {/* Info Content */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          <Link href={`/${getCompanySlug(company.id, company.name)}`}>
                            {company.name}
                          </Link>
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          <span className="flex items-center space-x-1 text-slate-600">
                            <span className="text-[#e91a2c] font-black font-mono">#</span>
                            <span>Mã số thuế:</span>
                            <Link
                              href={`/${getCompanySlug(company.id, company.name)}`}
                              className="font-mono font-bold text-[#c51322] bg-red-50 border border-red-100 px-2 py-0.5 rounded-md text-xs hover:bg-red-100 transition-colors whitespace-nowrap inline-block"
                            >
                              {normalizeTaxId(company.id)}
                            </Link>
                          </span>

                          {company.representative && (
                            <span className="flex items-center space-x-1 text-slate-600">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Người đại diện:</span>
                              <span className="font-bold text-slate-900 uppercase">{company.representative}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-start space-x-1 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <address className="not-italic truncate">{company.address}</address>
                        </div>

                        <div className="pt-0.5 flex flex-wrap items-center gap-2">
                          {(() => {
                            const tone = getCompanyStatusTone(company.status);
                            const StatusIcon = tone === 'active' ? CheckCircle2 : AlertTriangle;
                            return (
                              <span
                                className={`inline-flex items-center space-x-1 border font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${getCompanyStatusBadgeClass(company.status)}`}
                              >
                                <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                                <span>{company.status || 'Chưa rõ trạng thái'}</span>
                              </span>
                            );
                          })()}

                          {formatEstablishedDate(company.startDate || company.registrationDate) && (
                            <span className="inline-flex items-center space-x-1 bg-slate-50 text-slate-600 border border-slate-200 font-medium px-2.5 py-0.5 rounded-full text-[11px]">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                Thành lập:{' '}
                                <strong className="font-semibold text-slate-800">
                                  {formatEstablishedDate(company.startDate || company.registrationDate)}
                                </strong>
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* View profile button */}
                    <Link
                      href={`/${getCompanySlug(company.id, company.name)}`}
                      className="self-end md:self-center shrink-0 bg-red-50/90 hover:bg-red-100 active:bg-red-200/80 text-[#c51322] font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center space-x-1"
                    >
                      <span>Xem chi tiết hồ sơ thuế</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#e91a2c]" />
                    </Link>
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
    </>
  );
}

export default function Home() {
  return <HomeContent />;
}
