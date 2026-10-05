'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BusinessTaxInfo } from '@/types/tax';
import { getCompanySlug, getCompanyStatusBadgeClass } from '@/lib/constants';
import { Check, Copy, ArrowRight, MapPin, Building, User, Hash, AlertCircle, RefreshCw } from 'lucide-react';

interface TaxSearchResultsProps {
  results: BusinessTaxInfo[];
  isLoading: boolean;
  searchQuery: string;
  source?: string;
  disclaimer?: string;
  onClear?: () => void;
}

export function TaxSearchResults({
  results,
  isLoading,
  searchQuery,
  source,
  disclaimer,
  onClear
}: TaxSearchResultsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-amber-300 rounded-lg p-8 my-6 text-center shadow-md animate-pulse">
        <div className="flex justify-center items-center space-x-3 text-amber-600 font-semibold mb-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Đang truy vấn trực tiếp từ cơ sở dữ liệu Thuế...</span>
        </div>
        <p className="text-xs text-gray-500">
          Đang kết nối API Tổng cục Thuế để lấy thông tin mới nhất cho: <strong className="text-gray-800 font-mono">{searchQuery}</strong>
        </p>
      </div>
    );
  }

  if (!searchQuery) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-amber-400 rounded-lg p-6 my-6 shadow-md">
      <div className="flex flex-wrap items-center justify-between border-b pb-3 mb-4 gap-2">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-base text-gray-900">
            Kết quả tra cứu cho: <span className="text-amber-600 font-mono underline">{searchQuery}</span>
          </span>
          <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
            {results.length} kết quả
          </span>
        </div>

        {source === 'vietqr-live-gdt' && (
          <div className="flex items-center text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-ping"></span>
            <strong>Live API (Tổng cục Thuế)</strong>
          </div>
        )}

        {onClear && (
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-red-600 underline ml-auto"
          >
            Đóng kết quả
          </button>
        )}
      </div>

      {disclaimer && (
        <div className="mb-4 text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded flex items-center space-x-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{disclaimer}</span>
        </div>
      )}

      {results.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm font-semibold mb-1">Không tìm thấy mã số thuế hoặc doanh nghiệp phù hợp</p>
          <p className="text-xs text-gray-400">
            Gợi ý: Kiểm tra lại mã số thuế (10 hoặc 13 chữ số) hoặc tìm theo tên viết tắt của doanh nghiệp.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {results.map((comp, idx) => {
            const detailSlug = getCompanySlug(comp.id, comp.name);
            return (
              <div key={`${comp.id}-${idx}`} className="border-b last:border-0 pb-5 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-blue-700 hover:underline">
                    <Link href={`/${detailSlug}`} prefetch={false}>
                      {comp.name}
                    </Link>
                  </h3>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded font-medium whitespace-nowrap border ${getCompanyStatusBadgeClass(comp.status)}`}
                  >
                    {comp.status || 'NNT đang hoạt động'}
                  </span>
                </div>

                {comp.internationalName && (
                  <div className="text-xs text-gray-500 italic mt-0.5">
                    Tên quốc tế: {comp.internationalName}
                  </div>
                )}

                {comp.shortName && (
                  <div className="text-xs text-gray-600 font-medium mt-0.5">
                    Tên viết tắt: <span className="text-gray-900">{comp.shortName}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-xs text-gray-700">
                  <div className="flex items-center space-x-1.5">
                    <Hash className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-semibold">Mã số thuế:</span>
                    <Link
                      href={`/${detailSlug}`}
                      prefetch={false}
                      className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 hover:underline"
                    >
                      {comp.id}
                    </Link>
                    <button
                      onClick={() => copyToClipboard(comp.id)}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition"
                      title="Sao chép mã số thuế"
                    >
                      {copiedId === comp.id ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {comp.representative && (
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="font-semibold">Đại diện pháp luật:</span>
                      <span className="text-gray-900 font-bold">{comp.representative}</span>
                    </div>
                  )}

                  <div className="flex items-start space-x-1.5 md:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="font-semibold">Địa chỉ trụ sở:</span>
                    <span className="text-gray-800">{comp.address}</span>
                  </div>

                  {comp.industryName && (
                    <div className="flex items-center space-x-1.5 md:col-span-2">
                      <Building className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="font-semibold">Ngành nghề chính:</span>
                      <span className="text-gray-700">{comp.industryName}</span>
                    </div>
                  )}
                </div>

                {/* View Details Action Button */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    Bấm để mở trang chi tiết đầy đủ 12 trường thông tin thuế
                  </span>
                  <Link
                    href={`/${detailSlug}`}
                    prefetch={false}
                    className="bg-[#fed700] hover:bg-amber-400 text-gray-900 font-bold px-4 py-1.5 rounded text-xs transition shadow-sm flex items-center space-x-1.5"
                  >
                    <span>Xem chi tiết mã số thuế</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
