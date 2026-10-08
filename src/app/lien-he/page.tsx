'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MessageSquare, Send, CheckCircle2, ChevronRight } from 'lucide-react';

const inputClass =
  'w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl ' +
  'placeholder:text-slate-400 transition-colors ' +
  'focus:outline-none focus:border-[#e91a2c] focus:ring-2 focus:ring-[#e91a2c]/15';

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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1">
        <div className="mst-container py-6">
          {/* Breadcrumb */}
          <nav className="text-xs text-slate-500 mb-4 flex items-center space-x-1.5">
            <Link href="/" className="hover:text-[#c51322] transition-colors">Tra cứu mã số thuế</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-semibold">Liên hệ</span>
          </nav>

          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-3.5 pb-5 mb-6 border-b border-slate-100">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-[#c51322] flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  Liên hệ với Tìm Kiếm Công Ty
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Gửi tin nhắn hoặc yêu cầu hỗ trợ, chúng tôi sẽ phản hồi qua email của bạn.
                </p>
              </div>
            </div>

            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h2 className="font-bold text-emerald-900 text-base mb-1.5">
                  Cảm ơn bạn đã gửi liên hệ!
                </h2>
                <p className="text-sm text-emerald-800 leading-relaxed max-w-md mx-auto">
                  Chúng tôi đã ghi nhận thông tin đóng góp của bạn và sẽ phản hồi qua email{' '}
                  <span className="font-semibold">{formData.email}</span> trong thời gian sớm nhất.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-5 text-sm font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                >
                  Gửi tin nhắn khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Họ và tên <span className="text-[#e91a2c]">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nguyễn Văn A"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email <span className="text-[#e91a2c]">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-taxid" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mã số thuế liên quan <span className="font-normal text-slate-400">(nếu có)</span>
                  </label>
                  <input
                    id="contact-taxid"
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="VD: 0319732689"
                    className={`${inputClass} font-mono`}
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nội dung liên hệ <span className="text-[#e91a2c]">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Nhập nội dung thắc mắc, cập nhật thông tin doanh nghiệp hoặc góp ý..."
                    className={`${inputClass} resize-y min-h-32`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto bg-[#e91a2c] hover:bg-[#c51322] active:bg-[#a80f1b] text-white font-semibold px-6 py-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Đang gửi...' : 'Gửi liên hệ'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
