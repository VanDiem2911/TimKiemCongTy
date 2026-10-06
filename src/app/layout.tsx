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
  title: "Tìm Kiếm Công Ty - Tra Cứu Mã Số Thuế & Doanh Nghiệp Toàn Quốc",
  description: "Tìm Kiếm Công Ty (timkiemcongty.com) - Tra cứu mã số thuế hơn 2 triệu doanh nghiệp, mã số thuế cá nhân, thông tin liên hệ và báo cáo rủi ro doanh nghiệp cập nhật liên tục.",
  icons: {
    icon: "/favicon.ico",
  }
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
