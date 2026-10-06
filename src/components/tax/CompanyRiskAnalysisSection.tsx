'use client';

import React, { useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Phone,
  Building2,
  FileCheck,
  Scale,
  Info,
  CheckCircle2,
  AlertOctagon,
  HelpCircle
} from 'lucide-react';
import { BusinessTaxInfo } from '@/types/tax';

interface CompanyRiskAnalysisSectionProps {
  company: BusinessTaxInfo;
}

interface RiskFactorItem {
  id: string;
  name: string;
  penalty: number;
  badgeText: string;
  isSafe: boolean;
  recordedValue: string;
  description: string;
  icon: React.ReactNode;
}

export function CompanyRiskAnalysisSection({ company }: CompanyRiskAnalysisSectionProps) {
  const analysis = useMemo(() => {
    let score = 0;
    const warnings: string[] = [];

    // 1. Trạng thái pháp lý
    const statusStr = (company.status || '').toLowerCase().trim();
    let statusPenalty = 0;
    let statusSafe = false;
    let statusBadge = '';
    let statusDesc = '';

    if (!company.status || statusStr.includes('không rõ') || statusStr.includes('chưa có') || statusStr === '') {
      statusPenalty = 65;
      statusBadge = '+65 điểm phạt';
      statusDesc = 'Không tìm thấy trạng thái chính thức trên hệ thống Thuế.';
      warnings.push('Trạng thái pháp lý trống hoặc không rõ ràng trên hệ thống Thuế.');
    } else if (
      statusStr.includes('không hoạt động') ||
      statusStr.includes('bỏ trốn') ||
      statusStr.includes('đóng mst') ||
      statusStr.includes('chấm dứt')
    ) {
      statusPenalty = 85;
      statusBadge = '+85 điểm phạt';
      statusDesc = 'Người nộp thuế không hoạt động tại địa chỉ đăng ký hoặc đã đóng mã số thuế.';
      warnings.push('CẢNH BÁO NGUY HIỂM: Doanh nghiệp không hoạt động tại địa chỉ đăng ký hoặc đã đóng mã số thuế.');
    } else if (statusStr.includes('tạm nghỉ') || statusStr.includes('tạm ngừng')) {
      statusPenalty = 40;
      statusBadge = '+40 điểm phạt';
      statusDesc = 'Doanh nghiệp đang trong trạng thái tạm ngừng kinh doanh có thời hạn.';
      warnings.push('Doanh nghiệp đang tạm ngừng hoạt động kinh doanh.');
    } else if (statusStr.includes('hoạt động')) {
      statusPenalty = 0;
      statusSafe = true;
      statusBadge = '✓ An toàn';
      statusDesc = 'Doanh nghiệp đang hoạt động và tuân thủ nghĩa vụ thuế bình thường.';
    } else {
      statusPenalty = 25;
      statusBadge = '+25 điểm phạt';
      statusDesc = 'Trạng thái hoạt động ghi nhận có điểm đặc thù cần đối chiếu thêm.';
      warnings.push(`Trạng thái hoạt động ghi nhận: "${company.status}".`);
    }
    score += statusPenalty;

    // 2. Thâm niên hoạt động
    let ageYears: number | null = null;
    const rawDate = company.startDate || company.registrationDate;
    if (rawDate) {
      const yearMatch = rawDate.match(/\b(19\d\d|20\d\d)\b/);
      if (yearMatch) {
        const startYear = parseInt(yearMatch[1], 10);
        const currentYear = new Date().getFullYear();
        ageYears = Math.max(0, currentYear - startYear);
      }
    }

    let agePenalty = 0;
    let ageSafe = false;
    let ageBadge = '';
    let ageDesc = '';

    if (ageYears === null) {
      agePenalty = 5;
      ageBadge = 'Không rõ';
      ageDesc = 'Không xác định được ngày thành lập trên hệ thống.';
    } else if (ageYears >= 3) {
      agePenalty = 0;
      ageSafe = true;
      ageBadge = '✓ An toàn';
      ageDesc = `Tuổi đời trên ${ageYears} năm hoạt động ổn định qua nhiều kỳ quyết toán thuế.`;
    } else if (ageYears >= 1) {
      agePenalty = 10;
      ageBadge = '+10 điểm phạt';
      ageDesc = `Doanh nghiệp hoạt động được khoảng ${ageYears} năm, đang trong chu kỳ tăng trưởng.`;
    } else {
      agePenalty = 20;
      ageBadge = '+20 điểm phạt';
      ageDesc = 'Doanh nghiệp mới thành lập dưới 1 năm: Khuyến nghị đối soát hóa đơn cẩn trọng.';
      warnings.push('Doanh nghiệp mới thành lập dưới 1 năm: Thường có nguy cơ cao về rủi ro hóa đơn mua bán lòng vòng.');
    }
    score += agePenalty;

    // 3. Thông tin liên hệ & Kênh truyền thông
    const contact = company.contactInfo;
    const isPhoneHidden =
      !company.phone ||
      company.phone.includes('ẩn') ||
      contact?.phoneStatus === 'hidden' ||
      contact?.phoneStatus === 'not_found';
    const hasWebsite = Boolean(contact?.hasWebsite && contact?.website);
    const hasEmail = Boolean(contact?.email && contact?.emailStatus === 'available');

    let contactPenalty = 0;
    let contactSafe = false;
    let contactBadge = '';
    let contactDesc = '';

    if (isPhoneHidden && !hasWebsite && !hasEmail) {
      contactPenalty = 15;
      contactBadge = '+15 điểm phạt';
      contactDesc = 'Số điện thoại bị che giấu hoặc email bị bỏ trống. Kênh trực tuyến chưa hoàn thiện.';
      warnings.push('Thông tin liên lạc bị cô lập (Số điện thoại bị ẩn/trống, Email trống). Doanh nghiệp ma thường không công khai thông tin thực tế.');
    } else if (isPhoneHidden && (hasWebsite || hasEmail)) {
      contactPenalty = 5;
      contactBadge = '+5 điểm phạt';
      contactDesc = 'Số điện thoại liên lạc bị ẩn nhưng doanh nghiệp đã có kênh số chính thức (Website/Email).';
    } else if (!isPhoneHidden && hasWebsite) {
      contactPenalty = 0;
      contactSafe = true;
      contactBadge = '✓ An toàn';
      contactDesc = 'Thông tin liên hệ minh bạch, đã công khai số điện thoại và website chính thức.';
    } else {
      contactPenalty = 5;
      contactBadge = '+5 điểm phạt';
      contactDesc = 'Có số điện thoại liên lạc, đang tiếp tục hoàn thiện các kênh số công khai.';
    }
    score += contactPenalty;

    // 4. Cơ quan quản lý Thuế & Địa bàn
    let taxOfficePenalty = 0;
    let taxOfficeSafe = false;
    let taxOfficeBadge = '';
    let taxOfficeDesc = '';

    if (!company.managedBy || company.managedBy.trim() === '') {
      taxOfficePenalty = 10;
      taxOfficeBadge = '+10 điểm phạt';
      taxOfficeDesc = 'Chưa ghi nhận rõ Chi cục/Cục thuế quản lý trực tiếp trên hệ thống.';
      warnings.push('Cơ quan quản lý thuế trực tiếp chưa có dữ liệu đồng bộ.');
    } else {
      taxOfficePenalty = 0;
      taxOfficeSafe = true;
      taxOfficeBadge = '✓ Rõ ràng';
      taxOfficeDesc = 'Trực thuộc cơ quan thuế quản lý và theo dõi nghĩa vụ thuế định kỳ.';
    }
    score += taxOfficePenalty;

    // Final normalized score between 5 and 100
    const finalScore = Math.min(100, Math.max(5, score));

    // Risk Tier Classification
    let riskTier: 'low' | 'medium' | 'high' = 'low';
    let riskLabel = 'MỨC: RỦI RO THẤP';
    let riskSubtitle = 'Độ tin cậy cao - An toàn giao dịch';
    let ringColor = '#10b981'; // emerald-500
    let badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    let recommendation =
      'Doanh nghiệp có hồ sơ pháp lý minh bạch, trạng thái thuế bình thường. Đủ điều kiện tín nhiệm để giao dịch thương mại, ký kết hợp đồng và xuất hóa đơn.';

    if (finalScore >= 56) {
      riskTier = 'high';
      riskLabel = 'MỨC: RỦI RO CAO';
      riskSubtitle = 'Cảnh báo rủi ro pháp lý & hóa đơn';
      ringColor = '#475569'; // slate-600
      badgeClass = 'bg-slate-200 text-slate-800 border-slate-300';
      recommendation =
        'Cần đặc biệt lưu ý kiểm tra tính hợp pháp của hóa đơn, khảo sát địa điểm trụ sở thực tế trước khi tạm ứng hoặc ký kết giao dịch giá trị lớn.';
    } else if (finalScore >= 25) {
      riskTier = 'medium';
      riskLabel = 'MỨC: RỦI RO TRUNG BÌNH';
      riskSubtitle = 'Cần kiểm tra & thẩm định thêm';
      ringColor = '#0284c7'; // sky-600
      badgeClass = 'bg-sky-50 text-sky-800 border-sky-200';
      recommendation =
        'Nên xác minh thêm giấy tờ pháp lý của người đại diện và hợp đồng nguyên tắc trước khi thực hiện các giao dịch thương mại.';
    }

    if (warnings.length === 0) {
      warnings.push('Không phát hiện cảnh báo rủi ro bất thường nào trong hồ sơ đăng ký thuế.');
      warnings.push('Doanh nghiệp có mã số thuế và trạng thái hoạt động hoàn toàn hợp lệ trên Cổng thông tin Tổng cục Thuế.');
    }

    const factors: RiskFactorItem[] = [
      {
        id: 'status',
        name: 'Trạng thái pháp lý',
        penalty: statusPenalty,
        badgeText: statusBadge,
        isSafe: statusSafe,
        recordedValue: company.status || 'Không rõ ràng',
        description: statusDesc,
        icon: <Scale className="w-4 h-4 text-blue-600" />
      },
      {
        id: 'age',
        name: 'Thâm niên hoạt động',
        penalty: agePenalty,
        badgeText: ageBadge,
        isSafe: ageSafe,
        recordedValue: ageYears !== null ? `${ageYears} năm (${rawDate})` : (rawDate || 'Không rõ'),
        description: ageDesc,
        icon: <Clock className="w-4 h-4 text-amber-600" />
      },
      {
        id: 'contact',
        name: 'Thông tin liên hệ & Kênh số',
        penalty: contactPenalty,
        badgeText: contactBadge,
        isSafe: contactSafe,
        recordedValue: isPhoneHidden
          ? 'SĐT: Bị ẩn/Trống • Kênh số: Chưa công bố'
          : `SĐT: ${company.phone} • Web: ${hasWebsite ? 'Đã xác minh' : 'Chưa có'}`,
        description: contactDesc,
        icon: <Phone className="w-4 h-4 text-emerald-600" />
      },
      {
        id: 'taxOffice',
        name: 'Cơ quan quản lý Thuế',
        penalty: taxOfficePenalty,
        badgeText: taxOfficeBadge,
        isSafe: taxOfficeSafe,
        recordedValue: company.managedBy || 'Chưa cập nhật',
        description: taxOfficeDesc,
        icon: <Building2 className="w-4 h-4 text-indigo-600" />
      }
    ];

    return {
      score: finalScore,
      riskTier,
      riskLabel,
      riskSubtitle,
      ringColor,
      badgeClass,
      recommendation,
      warnings,
      factors
    };
  }, [company]);

  // SVG Circular Gauge calculation
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (analysis.score / 100) * circumference;

  return (
    <div className="bg-white border border-gray-200 rounded p-6 shadow-sm my-6 transition-all duration-200">
      {/* Section Header */}
      <div className="border-b border-gray-200 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <h3 className="text-base font-bold text-gray-900">
            Đánh giá Rủi ro Doanh nghiệp & Chỉ số Tuân thủ Pháp lý
          </h3>
        </div>

        <div className="flex items-center space-x-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded">
          <Info className="w-3.5 h-3.5 text-gray-400" />
          <span>Thang điểm: 0 (An toàn) → 100 (Rủi ro cao)</span>
        </div>
      </div>

      {/* Main Grid: Left Score Gauge + Right Compliance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Score Meter & Company Identity Card */}
        <div className="lg:col-span-5 flex flex-col items-center bg-gray-50/50 border border-gray-200 rounded-lg p-5 text-center">
          {/* Circular SVG Gauge */}
          <div className="relative w-40 h-40 flex items-center justify-center my-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Background Track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-gray-200"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={analysis.ringColor}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-black font-mono tracking-tight text-gray-900 leading-none">
                {analysis.score}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">
                Điểm rủi ro
              </span>
              <span className="text-[11px] text-gray-400">
                / 100 điểm
              </span>
            </div>
          </div>

          {/* Risk Level Badge */}
          <div className="mt-2 mb-4">
            <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${analysis.badgeClass}`}>
              {analysis.riskTier === 'high' ? (
                <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
              ) : analysis.riskTier === 'medium' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{analysis.riskLabel}</span>
            </span>
            <p className="text-[11px] text-gray-500 mt-1">
              {analysis.riskSubtitle}
            </p>
          </div>

          {/* Company Target Card */}
          <div className="w-full bg-white border border-gray-200 rounded p-3 text-left space-y-1.5 shadow-2xs">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Doanh nghiệp kiểm tra
            </div>
            <div className="text-xs font-bold text-gray-900 line-clamp-2">
              {company.name}
            </div>
            <div className="text-xs text-gray-600 flex items-center space-x-1.5">
              <span className="font-medium text-gray-500">Mã số thuế:</span>
              <span className="font-mono font-bold text-amber-700">{company.id}</span>
            </div>
          </div>

          {/* Actionable Advice */}
          <div className="w-full mt-3 p-3 rounded text-left text-xs bg-white border border-gray-200 text-gray-700">
            <span className="font-bold text-gray-900 block mb-1">Khuyến nghị giao dịch:</span>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              {analysis.recommendation}
            </p>
          </div>
        </div>

        {/* Right Column (7 cols): Warnings & Compliance Indicators */}
        <div className="lg:col-span-7 space-y-4">
          {/* Cảnh Báo Quan Trọng (Alert Box) */}
          <div
            className={`border rounded-lg p-4 text-xs transition-colors ${
              analysis.riskTier === 'high'
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : analysis.riskTier === 'medium'
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold mb-2 uppercase tracking-wide text-xs">
              {analysis.riskTier === 'high' ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              ) : analysis.riskTier === 'medium' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              )}
              <span>Cảnh Báo Quan Trọng</span>
            </div>

            <ul className="space-y-1.5 text-xs">
              {analysis.warnings.map((warn, idx) => (
                <li key={idx} className="flex items-start space-x-2 leading-relaxed">
                  <span className="font-bold mt-0.5">•</span>
                  <span>{warn}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Chi Tiết Chỉ Số Tuân Thủ Pháp Lý */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <FileCheck className="w-4 h-4 text-gray-700" />
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Chi Tiết Chỉ Số Tuân Thủ Pháp Lý
              </h4>
            </div>

            <div className="space-y-2.5">
              {analysis.factors.map((factor) => (
                <div
                  key={factor.id}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50/40 hover:bg-white hover:border-blue-200 hover:shadow-2xs transition"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 bg-white border border-gray-200 rounded">
                        {factor.icon}
                      </div>
                      <span className="font-bold text-xs text-gray-900">
                        {factor.name}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-bold border ${
                        factor.isSafe
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : factor.penalty >= 40
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {factor.badgeText}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 pl-7 leading-relaxed">
                    {factor.description}
                  </p>

                  <div className="text-[11px] text-gray-500 pl-7 mt-1">
                    <span className="italic">
                      (Giá trị ghi nhận: <strong className="text-gray-700 font-semibold">{factor.recordedValue}</strong>)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="mt-5 pt-3 border-t border-gray-100 flex items-center space-x-2 text-[11px] text-gray-400">
        <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Lưu ý: Chỉ số rủi ro và tuân thủ pháp lý được hệ thống tổng hợp từ dữ liệu công khai trên Cổng thông tin Tổng cục Thuế, phục vụ mục đích tham khảo và cảnh báo sớm trước khi ký hợp đồng kinh tế.
        </span>
      </div>
    </div>
  );
}
