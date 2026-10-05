'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { User, Search, ShieldAlert, CheckCircle, Info, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { BusinessTaxInfo } from '@/types/tax';

export default function PersonalTaxPage() {
  const [personalId, setPersonalId] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<BusinessTaxInfo[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = personalId.trim();
    if (!cleanId) return;

    setIsLoading(true);
    setHasSearched(true);
    setErrorMessage(null);
    setSearchResults([]);

    try {
      // Direct live lookup via our API
      const res = await fetch(`/api/tax/lookup?q=${encodeURIComponent(cleanId)}&type=personalTax`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setSearchResults(json.data);
      } else {
        setErrorMessage(
          'Không tìm thấy dữ liệu mã số thuế cá nhân tương ứng trên hệ thống công khai. Vui lòng kiểm tra lại số CMND/CCCD hoặc truy cập ứng dụng eTax Mobile của Tổng cục Thuế để tra cứu định danh điện tử.'
        );
      }
    } catch (err) {
      console.error('Lỗi khi tra cứu mã số thuế cá nhân:', err);
      setErrorMessage('Đã xảy ra lỗi kết nối mạng. Vui lòng thử lại sau giây lát.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfb]">
      <Header />

      <main className="flex-1">
        <div className="mst-container py-4">
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-500 mb-4 flex items-center space-x-1.5">
            <Link href="/" className="hover:text-blue-600">Tra cứu mã số thuế</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-800 font-semibold">Mã số thuế cá nhân</span>
          </nav>

          {/* Centered Main Box */}
          <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-lg p-6 sm:p-10 shadow-sm my-4">
            <div className="text-center mb-8">
              <div className="inline-flex p-3 bg-amber-100 rounded-full text-amber-700 mb-3">
                <User className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Tra cứu mã số thuế cá nhân
              </h1>
              <p className="text-xs text-gray-500 max-w-lg mx-auto">
                Nhập số Căn cước công dân (CCCD), Chứng minh nhân dân (CMND) hoặc Mã số thuế để tra cứu thông tin trực tuyến từ Tổng cục Thuế.
              </p>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleLookup} className="mb-6">
              <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={personalId}
                    onChange={(e) => setPersonalId(e.target.value)}
                    placeholder="Nhập số CCCD (12 số), CMND (9 số) hoặc MST cá nhân..."
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#fed700] hover:bg-[#e0b200] text-gray-900 font-semibold px-6 py-2.5 rounded text-sm transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tra cứu...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Tra cứu</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Live Search Result Box */}
            {hasSearched && !isLoading && (
              <div className="mt-6">
                {searchResults.length > 0 ? (
                  <div className="border border-green-300 bg-green-50/50 rounded-lg p-5">
                    <div className="flex items-center space-x-2 text-green-700 font-bold text-sm mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span>Kết quả tra cứu mã số thuế trực tuyến:</span>
                    </div>

                    <div className="space-y-4">
                      {searchResults.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="bg-white border border-gray-200 rounded p-4 text-xs space-y-2">
                          <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="text-gray-500">Mã số thuế:</span>
                            <span className="font-mono font-bold text-amber-800 text-sm">{item.id}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="text-gray-500">Tên người nộp thuế:</span>
                            <span className="font-bold text-gray-900">{item.name}</span>
                          </div>
                          {item.address && (
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                              <span className="text-gray-500">Địa chỉ / Khu vực:</span>
                              <span className="text-gray-800 text-right">{item.address}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Trạng thái:</span>
                            <span className="text-green-700 font-semibold">{item.status || 'NNT đang hoạt động'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border border-amber-300 bg-amber-50/70 rounded-lg p-4 text-xs text-amber-900 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>{errorMessage}</div>
                  </div>
                )}
              </div>
            )}

            {/* Note on VNeID and Personal Tax Code Migration */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-600 space-y-3">
              <div className="flex items-start space-x-2 bg-blue-50 text-blue-800 p-3 rounded border border-blue-200">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-1">Chính sách đồng bộ Mã định danh cá nhân (CCCD):</strong>
                  Theo đề án 06 và quy định của Bộ Tài chính, mã số định danh cá nhân (số thẻ CCCD 12 số) sẽ được sử dụng thay thế hoàn toàn cho mã số thuế cá nhân khi hoàn tất tích hợp hệ thống VNeID và cơ sở dữ liệu quốc gia về dân cư.
                </div>
              </div>

              <div className="flex items-start space-x-2 bg-gray-50 p-3 rounded border border-gray-200">
                <ShieldAlert className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Bảo mật thông tin:</strong> Theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, tra cứu mã số thuế cá nhân chỉ phục vụ mục đích kiểm tra nghĩa vụ thuế và quyết toán thuế TNCN. Nghiêm cấm mọi hành vi cào quét hoặc thu thập trái phép thông tin căn cước công dân của người khác.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
