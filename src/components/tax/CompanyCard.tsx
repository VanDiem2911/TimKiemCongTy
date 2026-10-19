import Link from 'next/link';
import { Building2, MapPin, User, ChevronRight, CheckCircle2, Calendar, AlertTriangle } from 'lucide-react';
import { BusinessTaxInfo } from '@/types/tax';
import { getCompanySlug, getCompanyStatusBadgeClass, getCompanyStatusTone, normalizeTaxId, formatEstablishedDate } from '@/lib/constants';

interface CompanyCardProps {
  company: BusinessTaxInfo;
  /** Danh sách dài nên tắt tải trước để không kéo hàng chục trang chi tiết cùng lúc */
  prefetch?: boolean;
}

/**
 * Thẻ doanh nghiệp dùng chung cho danh sách "tra cứu gần đây" ở trang chủ và
 * bảng kết quả tìm kiếm, để hai nơi luôn hiển thị giống hệt nhau.
 */
export function CompanyCard({ company, prefetch }: CompanyCardProps) {
  const href = `/${getCompanySlug(company.id, company.name)}`;
  const tone = getCompanyStatusTone(company.status);
  const StatusIcon = tone === 'active' ? CheckCircle2 : AlertTriangle;
  const established = formatEstablishedDate(company.startDate || company.registrationDate);

  return (
    <article className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
      <div className="flex items-start sm:items-center space-x-4 flex-1 min-w-0">
        {/* Enterprise Icon Box */}
        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-slate-50/90 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-102 transition-transform shadow-2xs">
          <Building2 className="w-9 h-9 text-slate-400 stroke-[1.5]" />
        </div>

        {/* Info Content */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
            <Link href={href} prefetch={prefetch}>
              {company.name}
            </Link>
          </h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center space-x-1 text-slate-600">
              <span className="text-[#e91a2c] font-black font-mono">#</span>
              <span>Mã số thuế:</span>
              <Link
                href={href}
                prefetch={prefetch}
                className="font-mono font-bold text-[#c51322] bg-red-50 border border-red-100 px-2 py-0.5 rounded-md text-xs hover:bg-red-100 transition-colors whitespace-nowrap inline-block"
              >
                {normalizeTaxId(company.id)}
              </Link>
            </span>

            {company.representative && (
              <span className="flex items-center space-x-1 text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Người đại diện:</span>
                <span className="font-bold text-slate-900 uppercase">{company.representative}</span>
              </span>
            )}
          </div>

          <div className="flex items-start space-x-1 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <address className="not-italic truncate">{company.address}</address>
          </div>

          <div className="pt-0.5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center space-x-1 border font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${getCompanyStatusBadgeClass(company.status)}`}
            >
              <StatusIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{company.status || 'Chưa rõ trạng thái'}</span>
            </span>

            {established && (
              <span className="inline-flex items-center space-x-1 bg-slate-50 text-slate-600 border border-slate-200 font-medium px-2.5 py-0.5 rounded-full text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Thành lập: <strong className="font-semibold text-slate-800">{established}</strong>
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* View profile button */}
      <Link
        href={href}
        prefetch={prefetch}
        className="self-end md:self-center shrink-0 bg-red-50/90 hover:bg-red-100 active:bg-red-200/80 text-[#c51322] font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center space-x-1"
      >
        <span>Xem chi tiết hồ sơ thuế</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#e91a2c]" />
      </Link>
    </article>
  );
}
