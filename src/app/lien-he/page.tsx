'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MessageSquare, Send, CheckCircle2, ChevronRight } from 'lucide-react';

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

          <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded p-6 sm:p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-4 mb-6">
              Liên hệ với Tìm Kiếm Công Ty (timkiemcongty.com)
            </h1>

            <div>
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
                    className="mt-4 text-xs font-semibold text-green-800 underline hover:text-green-950 cursor-pointer"
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
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
