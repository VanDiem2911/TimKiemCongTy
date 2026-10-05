import type { Metadata } from "next";
import "./globals.css";

import { getBaseUrl } from "@/lib/constants";

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
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
