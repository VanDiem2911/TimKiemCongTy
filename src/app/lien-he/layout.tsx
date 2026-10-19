import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Liên hệ',
  description:
    'Liên hệ với Tìm Kiếm Công Ty: gửi góp ý, báo sai sót thông tin doanh nghiệp hoặc yêu cầu ẩn số điện thoại.',
  alternates: { canonical: '/lien-he' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
