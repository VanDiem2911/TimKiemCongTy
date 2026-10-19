import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tra cứu mã số thuế theo ngành nghề kinh doanh',
  description:
    'Tra cứu mã số thuế doanh nghiệp theo ngành nghề kinh doanh: chọn ngành để xem danh sách công ty, người đại diện và địa chỉ.',
  alternates: { canonical: '/tra-cuu-ma-so-thue-theo-nganh-nghe' },
};

export default function IndustryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
