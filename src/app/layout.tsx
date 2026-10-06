import type { Metadata, Viewport } from "next";
import "./globals.css";

import { getBaseUrl } from "@/lib/constants";

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
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "googled9e89220e5c9d49d",
  },
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
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
