import type { Metadata, Viewport } from "next";
import "./globals.css";

import { getBaseUrl } from "@/lib/constants";
import PageViewTracker from "@/components/PageViewTracker";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#e91a2c",
};

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Tìm Kiếm Công Ty - Tra Cứu Mã Số Thuế & Doanh Nghiệp Toàn Quốc",
    template: "%s | Tìm Kiếm Công Ty",
  },
  description: "Tìm Kiếm Công Ty (timkiemcongty.com) - Tra cứu mã số thuế hơn 2 triệu doanh nghiệp, mã số thuế cá nhân, thông tin liên hệ và báo cáo rủi ro doanh nghiệp cập nhật liên tục.",
  keywords: [
    "tra cứu mã số thuế",
    "mã số thuế công ty",
    "tra cứu doanh nghiệp",
    "tìm kiếm công ty",
    "mã số thuế",
    "mã số thuế cá nhân",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "googled9e89220e5c9d49d",
  },
  applicationName: "Tìm Kiếm Công Ty",
  openGraph: {
    title: "Tìm Kiếm Công Ty - Tra Cứu Mã Số Thuế & Doanh Nghiệp Toàn Quốc",
    description: "Tra cứu mã số thuế doanh nghiệp, thông tin người đại diện, trạng thái thuế và báo cáo rủi ro.",
    url: getBaseUrl(),
    siteName: "Tìm Kiếm Công Ty",
    locale: "vi_VN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = getBaseUrl();

  // Khai báo tên website cho Google. Đây là cách chính thức để Google biết
  // nên hiển thị tên nào trong kết quả tìm kiếm thay vì tự suy từ tên miền.
  const siteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    name: 'Tìm Kiếm Công Ty',
    alternateName: ['TimKiemCongTy', 'Tra cứu mã số thuế'],
    url: `${baseUrl}/`,
    inLanguage: 'vi-VN',
    publisher: { '@id': `${baseUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: 'Tìm Kiếm Công Ty',
    url: `${baseUrl}/`,
    logo: {
      '@type': 'ImageObject',
      url: `${baseUrl}/logo.png`,
    },
    description:
      'Cổng tra cứu thông tin mã số thuế và doanh nghiệp người nộp thuế trên toàn quốc.',
  };

  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {children}
        <PageViewTracker />
      </body>
    </html>
  );
}
