import React from 'react';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { findProvinceBySlug } from '@/lib/constants';
import { fetchLiveProvinceCompanies } from '@/lib/provinceCompanies';
import { ProvinceCompanyList } from '@/components/tax/ProvinceCompanyList';

interface PageProps {
  params: Promise<{ provinceSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { provinceSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.page || '1', 10) || 1;

  const province = findProvinceBySlug(provinceSlug);
  // Slug không khớp tỉnh nào thì không có trang nào đáng lập chỉ mục.
  if (!province) {
    return { robots: { index: false, follow: true } };
  }

  const path = `/tra-cuu-ma-so-thue-theo-tinh/${province.slug}`;
  const pageSuffix = currentPage > 1 ? ` - Trang ${currentPage}` : '';
  const title = `Tra cứu mã số thuế doanh nghiệp tại ${province.name}${pageSuffix}`;
  const description = `Danh sách doanh nghiệp mới thành lập tại ${province.name}: mã số thuế, tên công ty, người đại diện, địa chỉ và tình trạng hoạt động.`;
  const canonical = currentPage > 1 ? `${path}?page=${currentPage}` : path;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, locale: 'vi_VN', type: 'website' },
  };
}

export default async function ProvinceDetailPage({ params, searchParams }: PageProps) {
  const { provinceSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.page || '1', 10) || 1;

  // Find province info
  const province = findProvinceBySlug(provinceSlug);

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
