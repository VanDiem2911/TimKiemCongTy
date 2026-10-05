import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PROVINCES } from '@/lib/constants';
import { fetchLiveProvinceCompanies } from '@/lib/provinceCompanies';
import { ProvinceCompanyList } from '@/components/tax/ProvinceCompanyList';
import { ChevronRight } from 'lucide-react';

interface PageProps {
  params: Promise<{ provinceSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function ProvinceDetailPage({ params, searchParams }: PageProps) {
  const { provinceSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.page || '1', 10) || 1;

  // Find province info
  const province = PROVINCES.find(p => 
    p.slug === provinceSlug || 
    provinceSlug.includes(p.slug) ||
    p.slug.includes(provinceSlug)
  );

  const provinceName = province ? province.name : decodeURIComponent(provinceSlug);

  // Directly fetch 100% real companies from live masothue / real API
  const data = await fetchLiveProvinceCompanies(provinceSlug, currentPage, 25);

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfb]">
      <Header />

      <main className="flex-1">
        <div className="mst-container py-4">
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-500 mb-4 flex items-center space-x-1.5">
            <Link href="/" className="hover:text-blue-600">Tra cứu mã số thuế</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link href="/tra-cuu-ma-so-thue-theo-tinh" className="hover:text-blue-600">Tỉnh thành phố</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-800 font-semibold">{provinceName}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Content Area (8 Cols) */}
            <div className="lg:col-span-8 bg-white border border-gray-200 rounded p-6 shadow-sm">
              <ProvinceCompanyList
                initialCompanies={data.companies}
                provinceSlug={provinceSlug}
                provinceName={provinceName}
                total={data.total}
                page={data.page}
                pageSize={data.pageSize}
                totalPages={data.totalPages}
                source={data.source}
              />
            </div>

            {/* Sidebar (4 Cols) */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Other Provinces Box */}
              <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                <h3 className="font-bold text-sm text-gray-900 border-b border-gray-200 pb-2 mb-3">
                  Tỉnh / Thành phố khác
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {PROVINCES.slice(0, 16).map((p) => (
                    <Link
                      key={p.code}
                      href={`/tra-cuu-ma-so-thue-theo-tinh/${p.slug}`}
                      className={`p-1 rounded flex items-center justify-between transition hover:text-blue-600 ${
                        p.name === provinceName ? 'bg-amber-100 text-amber-900 font-bold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    </Link>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t text-center">
                  <Link
                    href="/tra-cuu-ma-so-thue-theo-tinh"
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Xem tất cả 63 tỉnh thành →
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
