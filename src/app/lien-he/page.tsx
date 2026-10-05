'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Mail, MessageSquare, Send, CheckCircle2, ChevronRight, Clock } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    taxId: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
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
            <span className="text-gray-800 font-semibold">Liên hệ</span>
          </nav>

          <div className="bg-white border border-gray-200 rounded p-6 sm:p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-4 mb-6">
              Liên hệ với Tìm Kiếm Công Ty (timkiemcongty.com)
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Column: Contact Form */}
              <div className="md:col-span-7">
                <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  <span>Gửi tin nhắn hoặc yêu cầu hỗ trợ</span>
                </h2>

                {submitted ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
                    <h3 className="font-bold text-green-800 text-sm mb-1">
                      Cảm ơn bạn đã gửi liên hệ!
                    </h3>
                    <p className="text-xs text-green-700">
                      Chúng tôi đã ghi nhận thông tin đóng góp của bạn và sẽ phản hồi qua email <span className="font-semibold">{formData.email}</span> trong thời gian sớm nhất.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-4 text-xs font-semibold text-green-800 underline hover:text-green-950"
                    >
                      Gửi tin nhắn khác
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 text-xs text-gray-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-1">
                          Họ và tên <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Nguyễn Văn A"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@example.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Mã số thuế liên quan (nếu có)
                      </label>
                      <input
                        type="text"
                        value={formData.taxId}
                        onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                        placeholder="VD: 0319732689"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Nội dung liên hệ <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Nhập nội dung thắc mắc, cập nhật thông tin doanh nghiệp hoặc góp ý..."
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-[#fed700] hover:bg-[#e0b200] text-gray-900 font-bold px-6 py-2.5 rounded shadow-sm transition flex items-center space-x-2 text-xs disabled:opacity-60 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Đang gửi...' : 'Gửi liên hệ'}</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Right Column: Contact Info Card */}
              <div className="md:col-span-5 bg-gray-50 border border-gray-200 rounded p-5 space-y-5">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                    Thông tin hỗ trợ
                  </h2>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Mọi ý kiến đóng góp, thắc mắc về cơ sở dữ liệu tra cứu thuế hoặc báo lỗi dữ liệu vui lòng liên hệ trực tiếp với chúng tôi:
                  </p>
                </div>

                <div className="space-y-3 text-xs text-gray-700">
                  <div className="flex items-start space-x-3">
                    <Mail className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900">Email:</div>
                      <a href="mailto:support@timkiemcongty.com" className="text-blue-600 hover:underline">
                        support@timkiemcongty.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <div>
                      <div className="font-semibold text-gray-900">Fanpage Facebook:</div>
                      <a
                        href="https://facebook.com/timkiemcongty"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        facebook.com/timkiemcongty
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Clock className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900">Thời gian phản hồi:</div>
                      <span>24/7 đối với hệ thống tự động; trong vòng 24h đối với xử lý dữ liệu.</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
                  <strong>Lưu ý:</strong> Tìm Kiếm Công Ty (timkiemcongty.com) là cổng tra cứu tổng hợp dữ liệu công khai. Nếu doanh nghiệp của bạn có thay đổi thông tin đăng ký kinh doanh, vui lòng cập nhật tại Phòng Đăng ký kinh doanh hoặc Chi cục Thuế quản lý trước để dữ liệu được đồng bộ.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
