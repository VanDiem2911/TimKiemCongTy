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
  Check,
  AlertCircle
} from 'lucide-react';
import { BusinessTaxInfo } from '@/types/tax';
import { getCompanySlug, getCompanyStatusBadgeClass } from '@/lib/constants';
import { CompanyContactSection } from '@/components/tax/CompanyContactSection';
import { CompanyRiskAnalysisSection } from '@/components/tax/CompanyRiskAnalysisSection';
import { HidePhoneModal } from '@/components/tax/HidePhoneModal';

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
    navigator.clipboard.writeText(company.id);
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
      <nav className="text-xs text-gray-500 mb-4 flex flex-wrap items-center gap-1.5">
        <Link href="/" className="hover:text-blue-600">Tra cứu mã số thuế</Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-600">{company.enterpriseType}</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-900 font-semibold truncate max-w-md">{company.name}</span>
      </nav>

      {/* Live Refresh Status Banner */}
      {refreshMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded text-xs flex items-center space-x-2.5 mb-4 shadow-sm animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{refreshMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Main Detail & Tables */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Organization Detail Section */}
          <div className="bg-white border border-gray-200 rounded p-6 shadow-sm">
            <header className="border-b border-gray-200 pb-3 mb-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                <span className="font-mono text-amber-600">{company.id}</span> - {company.name}
              </h1>
            </header>

            {/* table-taxinfo */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-gray-800 border border-gray-200 rounded">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th colSpan={2} className="px-4 py-3 text-left font-bold text-sm text-gray-900 bg-amber-50/50">
                      {company.name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="w-48 px-4 py-2.5 font-medium text-gray-500 bg-gray-50/50 flex items-center space-x-2">
                      <Hash className="w-3.5 h-3.5 text-gray-400" />
                      <span>Mã số thuế</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-amber-700 text-sm flex items-center justify-between">
                      <span>{company.id}</span>
                      <button
                        onClick={copyToClipboard}
                        className="text-gray-400 hover:text-gray-700 p-1 rounded transition text-xs font-normal flex items-center space-x-1"
                        title="Sao chép MST"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="text-[11px]">{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                      </button>
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50/50 flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>Địa chỉ Thuế</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {company.taxAddress}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50/50 flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>Địa chỉ</span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {company.address}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50/50 flex items-center space-x-2">
                      <Info className="w-3.5 h-3.5 text-gray-400" />
                      <span>Tình trạng</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block border px-2.5 py-0.5 rounded font-semibold text-[11px] ${getCompanyStatusBadgeClass(company.status)}`}>
                        {company.status}
                      </span>
                    </td>
                  </tr>

                  {company.internationalName && (
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50/50 flex items-center space-x-2">
                        <Globe className="w-3.5 h-3.5 text-gray-400" />
                        <span>Tên quốc tế</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 italic">
                        {company.internationalName}
                      </td>
                    </tr>
                  )}

                  {company.shortName && (
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50/50 flex items-center space-x-2">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        <span>Tên viết tắt</span>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-gray-900">
                        {company.shortName}
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50/50 flex items-center space-x-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>Người đại diện</span>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-blue-700">
                      <Link href={`/?q=${encodeURIComponent(company.representative || '')}&type=legalName`} className="hover:underline">
                        {company.representative}
                      </Link>
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50/50 flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>Điện thoại</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {company.phone && !company.phone.toLowerCase().includes('ẩn') && !company.phone.includes('Chưa cập nhật') ? (
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-gray-900">{company.phone}</span>
                          <button
                            type="button"
                            onClick={() => setIsHidePhoneModalOpen(true)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-2 py-0.5 rounded text-[11px] font-normal transition cursor-pointer"
                            title="Yêu cầu ẩn số điện thoại này khỏi website"
                          >
                            Ẩn số điện thoại
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">
                          {company.phone?.toLowerCase().includes('ẩn') ? 'Đã ẩn theo yêu cầu' : (company.phone || 'Chưa cập nhật')}
                        </span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50/50 flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>Ngày hoạt động</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      {company.startDate}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50/50 flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span>Quản lý bởi</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {company.managedBy}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50/50 flex items-center space-x-2">
                      <Building className="w-3.5 h-3.5 text-gray-400" />
                      <span>Loại hình DN</span>
                    </td>
                    <td className="px-4 py-2.5 text-blue-700">
                      {company.enterpriseType}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50/50 flex items-center space-x-2">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                      <span>Ngành nghề chính</span>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-blue-700 hover:underline">
                      <Link href={`/tra-cuu-ma-so-thue-theo-nganh-nghe/`}>
                        {company.mainIndustry}
                      </Link>
                    </td>
                  </tr>

                  {/* Footer Note with LIVE Cập nhật Button */}
                  <tr className="bg-gray-50">
                    <td colSpan={2} className="px-4 py-3 text-gray-600 text-[11px] leading-relaxed">
                      <span>
                        Cập nhật mã số thuế <strong className="text-gray-900 font-mono">{company.id}</strong> lần cuối vào{' '}
                        <em className="font-semibold text-gray-800 not-italic bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                          {company.lastUpdated}
                        </em>
                        . Bạn muốn cập nhật thông tin mới nhất?{' '}
                      </span>
                      <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="inline-flex items-center space-x-1.5 bg-[#d9534f] hover:bg-[#c9302c] active:bg-[#ac2925] text-white px-3 py-1 rounded text-xs font-bold transition shadow-sm disabled:opacity-60 cursor-pointer align-middle ml-1"
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
          <div className="bg-white border border-gray-200 rounded p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-200 pb-3 mb-4 flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-amber-500" />
              <span>Danh mục ngành nghề kinh doanh</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="mst-table">
                <thead>
                  <tr className="bg-gray-100 text-xs font-bold text-gray-700">
                    <th className="w-24">Mã</th>
                    <th>Ngành nghề</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs">
                  {(company.subIndustries || []).map((ind, idx) => (
                    <tr key={`${ind.code}-${idx}`} className={ind.isMain ? 'bg-amber-50/60 font-bold' : ''}>
                      <td className="font-mono text-blue-700 font-semibold">
                        <Link href={`/?q=${encodeURIComponent(ind.code)}&type=auto`} className="hover:underline" title={`Tìm doanh nghiệp theo mã ngành ${ind.code}`}>
                          {ind.code}
                        </Link>
                      </td>
                      <td className="text-gray-800">
                        <Link href={`/?q=${encodeURIComponent(ind.name)}&type=enterpriseName`} className="hover:text-blue-700 hover:underline">
                          {ind.name}
                        </Link>
                        {ind.isMain && (
                          <span className="ml-2 text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase">
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

          {/* Doanh nghiệp cùng khu vực */}
          <div className="bg-white border border-gray-200 rounded p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-200 pb-3 mb-4 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span>Doanh nghiệp cùng khu vực lân cận</span>
            </h3>

            <div className="divide-y divide-gray-200 text-xs">
              {(company.nearbyCompanies || [])
                .filter((near, idx, arr) => arr.findIndex((n) => n.id === near.id) === idx)
                .map((near, idx) => (
                  <div key={`${near.id}-${idx}`} className="py-3 first:pt-0 last:pb-0">
                    <h4 className="font-bold text-blue-700 hover:underline mb-1">
                      <Link href={`/${getCompanySlug(near.id, near.name)}`}>
                        {near.name}
                      </Link>
                    </h4>
                    <div className="text-gray-600 space-y-0.5">
                      <div>
                        Mã số thuế: <span className="font-mono font-bold text-amber-700">{near.id}</span>
                        {near.rep && (
                          <span className="ml-3">Người đại diện: <strong className="text-gray-800">{near.rep}</strong></span>
                        )}
                      </div>
                      <div className="text-gray-500 flex items-start space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span>{near.address}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Quick Actions & Help */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider border-b pb-2">
              Thao tác nhanh
            </h3>

            <div className="space-y-2 text-xs">
              <button
                onClick={copyToClipboard}
                className="w-full bg-[#fed700] hover:bg-[#e0b200] text-gray-900 font-semibold py-2 px-3 rounded flex items-center justify-center space-x-2 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép MST!' : 'Sao chép mã số thuế'}</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded flex items-center justify-center space-x-2 transition disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Đang cập nhật từ Cục Thuế...' : 'Làm mới thông tin từ Cục Thuế'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsHidePhoneModalOpen(true)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded flex items-center justify-center space-x-2 transition text-center cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Yêu cầu ẩn số điện thoại / thông tin</span>
              </button>
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
    </div>
  );
}
