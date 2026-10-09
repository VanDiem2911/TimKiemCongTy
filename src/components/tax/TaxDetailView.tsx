'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Hash,
  MapPin,
  Info,
  Globe,
  FileText,
  User,
  Phone,
  Calendar,
  Users,
  Building,
  Briefcase,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { BusinessTaxInfo } from '@/types/tax';
import { PROVINCES, getCompanyStatusBadgeClass, normalizeTaxId } from '@/lib/constants';
import { CompanyContactSection } from '@/components/tax/CompanyContactSection';
import { CompanyRiskAnalysisSection } from '@/components/tax/CompanyRiskAnalysisSection';
import { HidePhoneModal } from '@/components/tax/HidePhoneModal';
import { ScrollToTopButton } from '@/components/common/ScrollEnhancements';

interface TaxDetailViewProps {
  initialCompany: BusinessTaxInfo;
  slug: string;
}

export function TaxDetailView({ initialCompany, slug }: TaxDetailViewProps) {
  const [company, setCompany] = useState<BusinessTaxInfo>(initialCompany);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isHidePhoneModalOpen, setIsHidePhoneModalOpen] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(normalizeTaxId(company.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);

    try {
      const res = await fetch('/api/tax/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, taxId: company.id })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCompany(json.data);
          setRefreshMessage(`Đã cập nhật dữ liệu mới nhất từ Cục Thuế vào lúc ${json.data.lastUpdated}`);
          setTimeout(() => setRefreshMessage(null), 6000);
        }
      } else {
        // Fallback to GET detail with force flag
        const getRes = await fetch(`/api/tax/detail/${company.id}?refresh=true`);
        if (getRes.ok) {
          const json = await getRes.json();
          if (json.success && json.data) {
            setCompany(json.data);
            setRefreshMessage(`Đã cập nhật dữ liệu mới nhất từ Cục Thuế vào lúc ${json.data.lastUpdated}`);
            setTimeout(() => setRefreshMessage(null), 6000);
          }
        }
      }
    } catch (err) {
      console.error('Lỗi khi làm mới dữ liệu thuế:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 mb-4 flex flex-wrap items-center gap-1.5">
        <Link href="/" className="hover:text-[#e91a2c] transition-colors">Tra cứu mã số thuế</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-600 truncate max-w-[120px] sm:max-w-none">{company.enterpriseType}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-900 font-semibold truncate max-w-[140px] sm:max-w-xs md:max-w-md">{company.name}</span>
      </nav>

      {/* Live Refresh Status Banner */}
      {refreshMessage && (
        <div className="bg-slate-100 border border-slate-300 text-slate-800 px-4 py-3 rounded-lg text-xs flex items-center space-x-2.5 mb-4 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{refreshMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Main Detail & Tables */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Organization Detail Section */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-6 shadow-xs">
            <header className="border-b border-slate-100 pb-3.5 mb-4">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug">
                <span className="font-mono text-[#c51322] bg-[#fff0f1] px-2 py-0.5 rounded border border-[#fecdd3] mr-2 whitespace-nowrap inline-block text-sm sm:text-base">{normalizeTaxId(company.id)}</span>
                <span className="break-words">{company.name}</span>
              </h1>
            </header>

            {/* table-taxinfo */}
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg overflow-hidden">
                <colgroup>
                  <col className="w-28 sm:w-40 md:w-48" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th colSpan={2} className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-bold text-xs sm:text-sm text-slate-900 bg-slate-100/70">
                      {company.name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="w-28 sm:w-40 md:w-48 px-3 sm:px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle">
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Mã số thuế</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 align-middle">
                      <div className="flex items-center justify-between gap-2 sm:gap-4">
                        <span className="font-mono font-bold text-[#e91a2c] text-xs sm:text-base whitespace-nowrap tracking-wide select-all shrink-0">
                          {normalizeTaxId(company.id)}
                        </span>
                        <button
                          type="button"
                          onClick={copyToClipboard}
                          className="inline-flex items-center space-x-1 sm:space-x-1.5 text-slate-500 hover:text-[#e91a2c] hover:bg-[#fff0f1] px-2 sm:px-2.5 py-1 rounded transition text-xs font-normal whitespace-nowrap shrink-0 border border-slate-200 cursor-pointer"
                          title="Sao chép MST"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                          <span className="text-[11px] whitespace-nowrap font-sans">{copied ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Địa chỉ Thuế</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 align-middle">
                      {company.taxAddress}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Địa chỉ</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 align-middle">
                      {company.address}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle">
                      <div className="flex items-center space-x-2">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Tình trạng</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      {company.status ? (
                        <span className={`inline-block border px-2.5 py-0.5 rounded-md font-medium text-[11px] ${getCompanyStatusBadgeClass(company.status)}`}>
                          {company.status}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa cập nhật</span>
                      )}
                    </td>
                  </tr>

                  {company.internationalName && (
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Tên quốc tế</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 italic align-middle">
                        {company.internationalName}
                      </td>
                    </tr>
                  )}

                  {company.shortName && (
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Tên viết tắt</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900 align-middle">
                        {company.shortName}
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle">
                      <div className="flex items-center space-x-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Người đại diện</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-[#e91a2c] align-middle">
                      {company.representative ? (
                        <Link href={`/?q=${encodeURIComponent(company.representative)}&type=legalName`} className="hover:underline">
                          {company.representative}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic font-normal">Chưa cập nhật</span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Điện thoại</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 align-middle">
                      {company.phone && !company.phone.toLowerCase().includes('ẩn') && !company.phone.includes('Chưa cập nhật') ? (
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-slate-900">{company.phone}</span>
                          <button
                            type="button"
                            onClick={() => setIsHidePhoneModalOpen(true)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-2 py-0.5 rounded text-[11px] font-normal transition cursor-pointer"
                            title="Yêu cầu ẩn số điện thoại này khỏi website"
                          >
                            Ẩn số điện thoại
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">
                          {company.phone?.toLowerCase().includes('ẩn') ? 'Đã ẩn theo yêu cầu' : (company.phone || 'Chưa cập nhật')}
                        </span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Ngày hoạt động</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-800 align-middle">
                      {company.startDate || company.registrationDate || (
                        <span className="text-slate-400 italic font-sans">Chưa cập nhật</span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle">
                      <div className="flex items-center space-x-2">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Quản lý bởi</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 align-middle">
                      {company.managedBy || <span className="text-slate-400 italic">Chưa cập nhật</span>}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle">
                      <div className="flex items-center space-x-2">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Loại hình DN</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 font-medium align-middle">
                      {company.enterpriseType || <span className="text-slate-400 italic font-normal">Chưa cập nhật</span>}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Ngành nghề chính</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      {company.mainIndustry || company.industryName ? (
                        <Link
                          href={`/tra-cuu-ma-so-thue-theo-nganh-nghe/`}
                          className="font-bold text-[#e91a2c] hover:underline"
                        >
                          {company.mainIndustry || company.industryName}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">Chưa cập nhật</span>
                      )}
                    </td>
                  </tr>

                  {/* Footer Note with LIVE Cập nhật Button */}
                  <tr className="bg-slate-50">
                    <td colSpan={2} className="px-4 py-3 text-slate-600 text-[11px] leading-relaxed">
                      <span>
                        Cập nhật mã số thuế <strong className="text-slate-900 font-mono whitespace-nowrap">{normalizeTaxId(company.id)}</strong> lần cuối vào{' '}
                        <em className="font-semibold text-slate-800 not-italic bg-slate-200/70 px-1.5 py-0.5 rounded border border-slate-300">
                          {company.lastUpdated}
                        </em>
                        . Bạn muốn cập nhật thông tin mới nhất?{' '}
                      </span>
                      <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="inline-flex items-center space-x-1.5 bg-[#e91a2c] hover:bg-[#c51322] active:bg-[#a80f1b] text-white px-3 py-1 rounded-md text-xs font-medium transition shadow-xs disabled:opacity-60 cursor-pointer align-middle ml-1"
                        title="Gọi API lấy dữ liệu mới nhất từ Tổng cục Thuế"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Đang cập nhật...' : 'Cập nhật'}</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Ngành nghề kinh doanh Table */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-[#e91a2c]" />
              <span>Danh mục ngành nghề kinh doanh</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="mst-table">
                <thead>
                  <tr className="bg-slate-50 text-xs font-bold text-slate-700">
                    <th className="w-24">Mã</th>
                    <th>Ngành nghề</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(company.subIndustries || []).map((ind, idx) => (
                    <tr key={`${ind.code}-${idx}`} className={ind.isMain ? 'bg-sky-50/50 font-semibold' : ''}>
                      <td className="font-mono text-sky-700 font-bold">
                        <Link href={`/?q=${encodeURIComponent(ind.code)}&type=auto`} className="hover:underline" title={`Tìm doanh nghiệp theo mã ngành ${ind.code}`}>
                          {ind.code}
                        </Link>
                      </td>
                      <td className="text-slate-800">
                        <Link href={`/?q=${encodeURIComponent(ind.name)}&type=enterpriseName`} className="hover:text-sky-700 hover:underline">
                          {ind.name}
                        </Link>
                        {ind.isMain && (
                          <span className="ml-2 text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
                            Ngành chính
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Thông tin liên hệ & Kênh trực tuyến của công ty */}
          <CompanyContactSection company={company} />

          {/* Đánh giá Rủi ro Doanh nghiệp & Chỉ số Tuân thủ Pháp lý */}
          <CompanyRiskAnalysisSection company={company} />

        </div>

        {/* Right 4 Cols: Navigation Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Province Lookup Box */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2.5 mb-3 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-sky-600" />
              <span>Tra cứu theo tỉnh / thành phố</span>
            </h3>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {PROVINCES.slice(0, 16).map((p) => (
                <Link
                  key={p.code}
                  href={`/tra-cuu-ma-so-thue-theo-tinh/${p.slug}`}
                  prefetch={false}
                  className="text-slate-700 hover:text-sky-600 hover:bg-slate-50 px-2 py-1.5 rounded-md flex items-center justify-between transition-colors"
                >
                  <span className={p.isMajor ? 'font-semibold text-slate-900' : ''}>{p.name}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </Link>
              ))}
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-center">
              <Link
                href="/tra-cuu-ma-so-thue-theo-tinh/"
                className="text-xs text-sky-700 hover:text-sky-800 font-semibold inline-flex items-center space-x-1"
              >
                <span>Xem toàn bộ 63 tỉnh thành</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Hide Phone Modal */}
      <HidePhoneModal
        company={company}
        isOpen={isHidePhoneModalOpen}
        onClose={() => setIsHidePhoneModalOpen(false)}
        onSuccess={() => {
          setCompany((prev) => ({
            ...prev,
            phone: 'Đã gửi yêu cầu ẩn',
          }));
        }}
      />

      <ScrollToTopButton />
    </div>
  );
}
