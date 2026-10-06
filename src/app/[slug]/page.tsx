import React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TaxDetailView } from '@/components/tax/TaxDetailView';
import { getCachedCompanyProfile } from '@/lib/taxEngine';
import { getCompanySlug, getBaseUrl } from '@/lib/constants';
import { recordRecentLookup } from '@/lib/recentLookups';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const company = await getCachedCompanyProfile(slug);

  if (!company) {
    return {
      title: 'Không tìm thấy thông tin doanh nghiệp - Mã số thuế',
      description: 'Không tìm thấy thông tin mã số thuế hoặc doanh nghiệp theo đường dẫn yêu cầu.',
    };
  }

  const canonicalSlug = getCompanySlug(company.id, company.name);
  const title = `${company.id} - ${company.name} - Tra cứu Mã số thuế`;

  const descParts = [
    `Tra cứu mã số thuế ${company.id} - ${company.name}`,
    company.address ? `Địa chỉ: ${company.address}` : '',
    company.representative ? `Người đại diện: ${company.representative}` : '',
    company.startDate ? `Ngày hoạt động: ${company.startDate}` : '',
    company.industryName ? `Ngành nghề chính: ${company.industryName}` : '',
    company.status ? `Tình trạng: ${company.status}` : '',
  ].filter(Boolean);
  const description = descParts.join('. ') + '.';

  const baseUrl = getBaseUrl();
  const canonicalUrl = `${baseUrl}/${canonicalSlug}`;

  return {
    title,
    description,
    keywords: [
      company.id,
      company.name,
      'mã số thuế',
      'tra cứu mã số thuế',
      company.representative,
      company.province,
      'thông tin doanh nghiệp',
      company.industryCode,
      company.internationalName,
      company.shortName,
    ].filter(Boolean) as string[],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Tìm Kiếm Công Ty',
      locale: 'vi_VN',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const company = await getCachedCompanyProfile(slug);

  if (!company) {
    notFound();
  }

  recordRecentLookup(company);

  const canonicalSlug = getCompanySlug(company.id, company.name);

  // If the user accessed with just the raw tax ID or non-canonical slug,
  // redirect permanently to the canonical SEO URL: /{taxId}-{ten-cong-ty}
  if (slug !== canonicalSlug) {
    redirect(`/${canonicalSlug}`);
  }

  const baseUrl = getBaseUrl();

  // Schema.org Structured Data for Google Rich Snippets
  const corporationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Corporation',
    name: company.name,
    alternateName: [company.internationalName, company.shortName].filter(Boolean),
    taxID: company.id,
    identifier: company.id,
    url: `${baseUrl}/${canonicalSlug}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.taxAddress || company.address,
      addressLocality: company.province,
      addressCountry: 'VN',
    },
    telephone: company.phone && company.phone !== 'Bị ẩn theo yêu cầu người dùng' ? company.phone : undefined,
    foundingDate: company.startDate,
    founder: company.representative
      ? {
          '@type': 'Person',
          name: company.representative,
        }
      : undefined,
    description: `Mã số thuế ${company.id} - ${company.name}. Người đại diện: ${company.representative}. Địa chỉ: ${company.address}`,
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Trang chủ',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: company.province ? `Doanh nghiệp tại ${company.province}` : 'Tra cứu theo tỉnh thành',
        item: `${baseUrl}/tra-cuu-ma-so-thue-theo-tinh`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: company.name,
        item: `${baseUrl}/${canonicalSlug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfb]">
      {/* Schema.org Structured Data for Google Search Indexing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(corporationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Header />

      <main className="flex-1">
        <div className="mst-container py-4">
          <TaxDetailView initialCompany={company} slug={canonicalSlug} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
