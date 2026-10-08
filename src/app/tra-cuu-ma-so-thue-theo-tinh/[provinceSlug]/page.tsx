import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PROVINCES } from '@/lib/constants';
import { fetchLiveProvinceCompanies } from '@/lib/provinceCompanies';
import { ProvinceCompanyList } from '@/components/tax/ProvinceCompanyList';

interface PageProps {
  params: Promise<{ provinceSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function ProvinceDetailPage({ params, searchParams }: PageProps) {
  const { provinceSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.page || '1', 10) || 1;

  // Find province info
  const province = PROVINCES.find(
    (p) =>
      p.slug === provinceSlug ||
      provinceSlug.includes(p.slug) ||
      p.slug.includes(provinceSlug)
  );

  const provinceName = province ? province.name : decodeURIComponent(provinceSlug);

  // Directly fetch 100% real companies from live masothue / real API / MongoDB
  const data = await fetchLiveProvinceCompanies(provinceSlug, currentPage, 25);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Header />

      <main className="flex-1">
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
      </main>

      <Footer />
    </div>
  );
}
