'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Loader2, Phone } from 'lucide-react';
import { BusinessTaxInfo } from '@/types/tax';

interface HidePhoneModalProps {
  company: BusinessTaxInfo;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function HidePhoneModal({ company, isOpen, onClose, onSuccess }: HidePhoneModalProps) {
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [reasonCategory, setReasonCategory] = useState('spam');
  const [reasonDetail, setReasonDetail] = useState('');
  const [identityProof, setIdentityProof] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('Vui lòng đồng ý với cam kết xác thực thông tin.');
      return;
    }

    setLoading(true);
    setError(null);

    const fullReason = `[${reasonCategory === 'spam' ? 'Bị làm phiền / Cuộc gọi rác' : reasonCategory === 'personal' ? 'Số điện thoại cá nhân không công khai' : reasonCategory === 'changed' ? 'Đã đổi số điện thoại / Đổi chủ' : 'Lý do khác'}] ${reasonDetail}`.trim();

    try {
      const res = await fetch('/api/privacy/hide-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxId: company.id,
          companyName: company.name,
          phone: company.phone,
          requesterName,
          requesterPhone,
          requesterEmail,
          reason: fullReason,
          identityProof,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsSubmitted(true);
        if (onSuccess) onSuccess();
      } else {
        setError(data.error || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error(err);
      setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden text-gray-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-sm text-gray-900">
              Yêu cầu ẩn số điện thoại doanh nghiệp
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[85vh] overflow-y-auto text-xs">
          {isSubmitted ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
              <h4 className="text-base font-bold text-gray-900">
                Gửi yêu cầu ẩn số điện thoại thành công!
              </h4>
              <p className="text-gray-600 leading-relaxed max-w-sm mx-auto">
                Hệ thống đã tiếp nhận yêu cầu cho mã số thuế <strong className="font-mono text-gray-900">{company.id}</strong>. Ban quản trị sẽ đối soát và phê duyệt trong vòng 2-4 giờ làm việc.
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded font-semibold text-xs transition"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target info card */}
              <div className="bg-amber-50/70 border border-amber-200 rounded p-3 text-xs space-y-1">
                <div>
                  <span className="text-gray-500 font-medium">Doanh nghiệp:</span>{' '}
                  <strong className="text-gray-900">{company.name}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-500 font-medium">Mã số thuế:</span>{' '}
                    <strong className="font-mono text-amber-800">{company.id}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">SĐT cần ẩn:</span>{' '}
                    <strong className="font-mono text-red-600">{company.phone || 'Chưa cập nhật'}</strong>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded text-xs">
                  {error}
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Họ và tên người yêu cầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    SĐT liên hệ / Zalo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Email nhận kết quả xử lý
                </label>
                <input
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  placeholder="contact@doanhnghiep.vn"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="hide-phone-reason" className="block text-gray-700 font-bold mb-1">
                  Lý do yêu cầu ẩn <span className="text-red-500">*</span>
                </label>
                <select
                  id="hide-phone-reason"
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded mb-2 bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="spam">Số máy thường xuyên nhận cuộc gọi rác / bảo hiểm / ngân hàng</option>
                  <option value="personal">Số điện thoại cá nhân riêng tư, không dùng cho giao dịch</option>
                  <option value="changed">Doanh nghiệp đã đổi số liên hệ mới / chuyển nhượng</option>
                  <option value="other">Lý do khác</option>
                </select>

                <textarea
                  rows={2}
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  placeholder="Ghi chú thêm chi tiết lý do (không bắt buộc)..."
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Thông tin xác minh (Số CCCD người đại diện hoặc GPKD)
                </label>
                <input
                  type="text"
                  value={identityProof}
                  onChange={(e) => setIdentityProof(e.target.value)}
                  placeholder="Ví dụ: CCCD số 00123... hoặc GPKD số 0300..."
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Commitment Checkbox */}
              <div className="pt-2">
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-gray-600 leading-tight">
                    Tôi xác nhận là người đại diện hoặc được sự đồng ý của doanh nghiệp để yêu cầu ẩn số điện thoại này theo chính sách bảo mật thông tin.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-gray-950 font-bold rounded transition flex items-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
                  <span>{loading ? 'Đang gửi...' : 'Gửi yêu cầu ẩn'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
