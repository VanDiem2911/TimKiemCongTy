'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Navigation,
  RefreshCw
} from 'lucide-react';
import { BusinessTaxInfo, CompanyContactAI } from '@/types/tax';

interface CompanyContactSectionProps {
  company: BusinessTaxInfo;
}

export function CompanyContactSection({ company }: CompanyContactSectionProps) {
  const [contact, setContact] = useState<CompanyContactAI | null>(company.contactInfo || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Quét thông tin (tự động lưu cache session)
  const performLiveScan = async (force = false) => {
    const sessionKey = 'contact_scan_live_v3_' + company.id;

    // Kiểm tra cache trình duyệt nếu không yêu cầu quét lại cưỡng bức
    if (!force) {
      try {
        const stored = sessionStorage.getItem(sessionKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.website) {
            setContact(parsed);
            return;
          }
        }
      } catch {}
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/tax/ai-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxId: company.id,
          companyName: company.name,
          shortName: company.shortName,
          internationalName: company.internationalName,
          address: company.address,
          phone: company.phone,
          force
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setContact(json.data);
          try {
            sessionStorage.setItem(sessionKey, JSON.stringify(json.data));
          } catch {}
        }
      }
    } catch (err) {
      console.error('Lỗi khi quét thông tin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Tự động tìm kiếm khi người dùng vào xem
  useEffect(() => {
    if (!contact?.website) {
      performLiveScan(false);
    }
  }, [company.id]);

  // Fallback defaults if contact is not loaded yet
  const displayPhone = contact?.phone || company.phone || 'Chưa cập nhật';
  const displayAddress = contact?.address || company.address;
  const hasWebsite = contact?.hasWebsite || false;
  const websiteUrl = contact?.website;
  const displayEmail = contact?.email;

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs my-6 transition-all duration-200">
      {/* Header bar with re-scan button */}
      <div className="border-b border-slate-100 pb-3 mb-5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 text-sky-600" />
          <h3 className="text-base font-bold text-slate-900">
            Thông tin liên hệ & Kênh trực tuyến của công ty
          </h3>
        </div>

        <button
          onClick={() => performLiveScan(true)}
          disabled={isLoading}
          className="text-xs text-slate-600 hover:text-sky-700 px-2.5 py-1 rounded-md border border-slate-200 hover:border-slate-300 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-60 bg-white"
          title="Cập nhật thông tin liên hệ trực tuyến"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
          <span>{isLoading ? 'Đang kiểm tra...' : 'Cập nhật'}</span>
        </button>
      </div>

      {/* 4 Pillars Grid: Phone, Email, Address, Website */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Số điện thoại */}
        <div className="border border-slate-200/90 rounded-lg p-4 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center space-x-1.5">
              <Phone className="w-4 h-4 text-sky-600" />
              <span>Số điện thoại / Hotline</span>
            </span>
            {contact?.phoneStatus === 'available' ? (
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                Đang hoạt động
              </span>
            ) : (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium border border-slate-200">
                Bị ẩn theo yêu cầu
              </span>
            )}
          </div>

          <div className="text-sm font-semibold text-slate-900 font-mono mb-3">
            {displayPhone}
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 text-xs">
            {contact?.phoneStatus === 'available' ? (
              <a
                href={`tel:${displayPhone.replace(/[^0-9+]/g, '')}`}
                className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded text-[11px] font-medium transition inline-flex items-center space-x-1"
              >
                <Phone className="w-3 h-3" />
                <span>Gọi ngay</span>
              </a>
            ) : null}
            <button
              onClick={() => copyToClipboard(displayPhone, 'phone')}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded text-[11px] font-medium transition inline-flex items-center space-x-1 cursor-pointer"
            >
              {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedField === 'phone' ? 'Đã chép' : 'Sao chép SĐT'}</span>
            </button>
          </div>
        </div>

        {/* 2. Hòm thư điện tử Email */}
        <div className="border border-slate-200/90 rounded-lg p-4 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center space-x-1.5">
              <Mail className="w-4 h-4 text-sky-600" />
              <span>Email doanh nghiệp</span>
            </span>
            {displayEmail ? (
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                Đã xác minh
              </span>
            ) : isLoading ? (
              <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded font-medium animate-pulse">
                Đang kiểm tra hệ thống...
              </span>
            ) : (
              <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-medium">
                Chưa cập nhật email
              </span>
            )}
          </div>

          <div className="text-sm font-medium text-slate-900 mb-3 truncate font-mono">
            {displayEmail || (isLoading ? 'Đang kiểm tra hòm thư...' : 'Chưa công khai trong hồ sơ')}
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 text-xs">
            {displayEmail ? (
              <>
                <a
                  href={`mailto:${displayEmail}`}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded text-[11px] font-medium transition inline-flex items-center space-x-1"
                >
                  <Mail className="w-3 h-3" />
                  <span>Gửi email</span>
                </a>
                <button
                  onClick={() => copyToClipboard(displayEmail, 'email')}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded text-[11px] font-medium transition inline-flex items-center space-x-1 cursor-pointer"
                >
                  {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'email' ? 'Đã chép' : 'Sao chép Email'}</span>
                </button>
              </>
            ) : (
              <span className="text-[11px] text-slate-400 italic">
                {isLoading ? 'Đang tra cứu dữ liệu...' : 'Doanh nghiệp chưa khai báo email công khai'}
              </span>
            )}
          </div>
        </div>

        {/* 3. Địa chỉ trụ sở */}
        <div className="border border-slate-200/90 rounded-lg p-4 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-sky-600" />
              <span>Địa chỉ hoạt động</span>
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium">
              Trụ sở chính
            </span>
          </div>

          <div className="text-xs text-slate-800 line-clamp-2 mb-3 leading-relaxed">
            {displayAddress}
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 text-xs">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1 rounded text-[11px] font-medium transition inline-flex items-center space-x-1"
            >
              <Navigation className="w-3 h-3" />
              <span>Chỉ đường</span>
            </a>
            <button
              onClick={() => copyToClipboard(displayAddress, 'address')}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded text-[11px] font-medium transition inline-flex items-center space-x-1 cursor-pointer"
            >
              {copiedField === 'address' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedField === 'address' ? 'Đã chép' : 'Sao chép địa chỉ'}</span>
            </button>
          </div>
        </div>

        {/* 4. Website chính thức */}
        <div className={`border rounded-lg p-4 transition ${
          hasWebsite
            ? 'bg-slate-50/70 border-slate-300 hover:bg-white'
            : isLoading
            ? 'bg-sky-50/20 border-sky-200'
            : 'bg-slate-50/50 border-slate-200/90 hover:bg-white'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center space-x-1.5">
              <Globe className={`w-4 h-4 ${hasWebsite ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>Website chính thức</span>
            </span>

            {hasWebsite ? (
              <span className="inline-flex items-center space-x-1 text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Đã xác thực</span>
              </span>
            ) : isLoading ? (
              <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded font-medium animate-pulse">
                Đang kiểm tra hệ thống...
              </span>
            ) : (
              <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-medium">
                Chưa cập nhật
              </span>
            )}
          </div>

          <div className="mb-3">
            {hasWebsite && websiteUrl ? (
              <div>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-sky-700 hover:underline truncate block font-mono"
                >
                  {websiteUrl}
                </a>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tên miền đang hoạt động và đồng bộ với doanh nghiệp
                </p>
              </div>
            ) : isLoading ? (
              <div>
                <div className="text-sm font-semibold text-sky-600 animate-pulse">
                  Đang dò tìm website chính thức...
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Hệ thống đang kiểm tra liên kết của công ty
                </p>
              </div>
            ) : (
              <div>
                <div className="text-sm font-semibold text-slate-500 italic">
                  Chưa cập nhật website
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Website chưa có trong dữ liệu doanh nghiệp
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 text-xs">
            {hasWebsite && websiteUrl ? (
              <>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded text-[11px] font-semibold transition inline-flex items-center space-x-1.5 shadow-xs"
                >
                  <span>Truy cập Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => copyToClipboard(websiteUrl, 'website')}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded text-[11px] font-medium transition inline-flex items-center space-x-1 cursor-pointer"
                >
                  {copiedField === 'website' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'website' ? 'Đã chép' : 'Sao chép Link'}</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
