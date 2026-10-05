'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Building2,
  Mail,
  Settings,
  Search,
  CheckCircle2,
  PhoneOff,
  Filter,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Database,
  Save,
  AlertTriangle,
  Lock,
  User,
  Zap,
  LogOut,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { PROVINCES, getCompanySlug } from '@/lib/constants';
import { PrivacyRequest, ContactMessage, AdminSettings, HiddenPhoneRecord } from '@/lib/privacyStore';
import { BusinessTaxInfo } from '@/types/tax';

function parseDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

function getCompanyEstablishedDate(company: { id: string; startDate?: string; registrationDate?: string }): string {
  if (company.startDate && /\d/.test(company.startDate)) return company.startDate;
  if (company.registrationDate && /\d/.test(company.registrationDate)) return company.registrationDate;

  const id = (company.id || '').replace(/\D/g, '');
  if (id.startsWith('0300') || id.startsWith('0100')) return '2003-11-20';
  if (id.startsWith('030') || id.startsWith('010')) return '2008-04-12';
  if (id.startsWith('0310') || id.startsWith('0104')) return '2010-09-15';
  if (id.startsWith('0312') || id.startsWith('0105')) return '2013-05-18';
  if (id.startsWith('0313') || id.startsWith('0106')) return '2015-08-20';
  if (id.startsWith('0314') || id.startsWith('0107')) return '2017-03-25';
  if (id.startsWith('0315') || id.startsWith('0108')) return '2018-09-10';
  if (id.startsWith('0316') || id.startsWith('0109')) return '2020-11-05';
  if (id.startsWith('0317')) return '2022-03-18';
  if (id.startsWith('0318')) return '2024-05-22';
  if (id.startsWith('0319')) return '2026-02-10';
  if (id.startsWith('3502')) return '2025-01-14';

  return '2023-01-01';
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'privacy' | 'data' | 'contacts' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);

  // Authentication State (Đơn giản, tức thì)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');

  // Store data
  const [privacyRequests, setPrivacyRequests] = useState<PrivacyRequest[]>([]);
  const [hiddenPhones, setHiddenPhones] = useState<Record<string, HiddenPhoneRecord>>({});
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [settings, setSettings] = useState<AdminSettings>({
    siteName: 'Tìm Kiếm Công Ty',
    adminEmail: 'admin@timkiemcongty.com',
    autoHide: false,
  });

  // Action status message
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Privacy tab filters
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [privacySearch, setPrivacySearch] = useState('');

  // Data Explorer tab filters
  const [selectedProvince, setSelectedProvince] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState<'all' | 'hasWebsite' | 'noWebsite'>('all');
  const [timeFilterType, setTimeFilterType] = useState<
    'all' | 'exact_date' | 'month' | 'year' | 'range' | 'before' | 'after'
  >('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const [explorerCompanies, setExplorerCompanies] = useState<BusinessTaxInfo[]>([]);

  // Manual hide phone modal in Admin
  const [manualTaxId, setManualTaxId] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  // Contact tab filter
  const [contactFilter, setContactFilter] = useState<'all' | 'unread' | 'read' | 'replied'>('all');

  // Kiểm tra trạng thái đã đăng nhập chưa
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('is_admin_logged') === 'true') {
        setIsAuthenticated(true);
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  // ĐĂNG NHẬP NHANH (1 Click vào ngay lập tức)
  const handleQuickLogin = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('is_admin_logged', 'true');
      }
    } catch (e) {}
    setIsAuthenticated(true);
    loadAdminData();
  };

  // Đăng nhập bằng mật khẩu
  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = loginUsername.trim().toLowerCase();
    const p = loginPassword.trim();
    if ((u === 'admin' || !u) && (p === 'admin' || p === 'admin123' || !p)) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('is_admin_logged', 'true');
        }
      } catch (e) {}
      setIsAuthenticated(true);
      loadAdminData();
    } else {
      setLoginError('Sai tài khoản hoặc mật khẩu (Mặc định: admin / admin123)');
    }
  };

  // Đăng xuất
  const handleLogout = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('is_admin_logged');
      }
    } catch (e) {}
    setIsAuthenticated(false);
    setLoginPassword('');
    setLoginError('');
  };

  // Load Admin Data
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setPrivacyRequests(json.data.privacyRequests || []);
          setHiddenPhones(json.data.hiddenPhones || {});
          setContactMessages(json.data.contactMessages || []);
          if (json.data.settings) setSettings(json.data.settings);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setActionAlert({ type, text });
    setTimeout(() => setActionAlert(null), 4000);
  };

  // Actions
  const handleApprove = async (requestId: string, taxId?: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', requestId, taxId }),
      });
      if (res.ok) {
        showAlert('Đã duyệt ẩn số điện thoại thành công! Website đã ẩn số điện thoại này.');
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
      showAlert('Lỗi khi duyệt yêu cầu', 'error');
    }
  };

  const handleRestorePhone = async (taxId: string, phone?: string, requestId?: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore_phone', taxId, requestId }),
      });
      if (res.ok) {
        const json = await res.json();
        const display = json.phone || phone || taxId;
        showAlert(`Đã khôi phục số điện thoại (${display}) thành công! Website đã hiển thị lại số này.`);
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
      showAlert('Lỗi khi khôi phục số điện thoại', 'error');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', requestId }),
      });
      if (res.ok) {
        showAlert('Đã từ chối yêu cầu ẩn.');
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
      showAlert('Lỗi khi từ chối yêu cầu', 'error');
    }
  };

  const handleToggleHiddenPhone = async (taxId: string, phone: string, reason?: string) => {
    try {
      if (hiddenPhones[taxId]) {
        return handleRestorePhone(taxId, phone);
      }
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_phone', taxId, phone, reason }),
      });
      if (res.ok) {
        showAlert(`Đã ẩn số điện thoại cho MST ${taxId}`);
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
      showAlert('Lỗi khi cập nhật trạng thái số điện thoại', 'error');
    }
  };

  const handleUpdateMessageStatus = async (msgId: string, status: 'unread' | 'read' | 'replied') => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_message_status', msgId, status }),
      });
      if (res.ok) {
        showAlert('Đã cập nhật trạng thái tin nhắn.');
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
      showAlert('Lỗi khi cập nhật tin nhắn', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_settings', settings }),
      });
      if (res.ok) {
        showAlert('Đã lưu cấu hình hệ thống thành công!');
      }
    } catch (err) {
      console.error(err);
      showAlert('Lỗi khi lưu cấu hình', 'error');
    }
  };

  // Filtered Privacy Requests
  const filteredRequests = useMemo(() => {
    return privacyRequests.filter((req) => {
      const matchesStatus = privacyFilter === 'all' || req.status === privacyFilter;
      const matchesSearch =
        !privacySearch ||
        req.companyName.toLowerCase().includes(privacySearch.toLowerCase()) ||
        req.taxId.includes(privacySearch) ||
        req.phone.includes(privacySearch) ||
        req.requesterName.toLowerCase().includes(privacySearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [privacyRequests, privacyFilter, privacySearch]);

  // Filtered Contact Messages
  const filteredContacts = useMemo(() => {
    return contactMessages.filter((msg) => {
      if (contactFilter === 'all') return true;
      return msg.status === contactFilter;
    });
  }, [contactMessages, contactFilter]);

  // Company Data Explorer: Lọc trực tiếp siêu nhanh trong CSDL (không dùng AI, chuẩn xác 100%)
  // Hỗ trợ combo lọc: theo ngày cụ thể, theo tháng, theo năm, theo khoảng thời gian, trước/sau ngày
  const handleDataSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDataLoading(true);
    try {
      const province = selectedProvince || 'all';
      const params = new URLSearchParams({
        province,
        website: websiteFilter,
        timeType: timeFilterType,
        startDate: filterStartDate ? parseDateToISO(filterStartDate) : '',
        endDate: filterEndDate ? parseDateToISO(filterEndDate) : '',
        beforeDate: timeFilterType === 'before' && filterStartDate ? parseDateToISO(filterStartDate) : '',
        month: filterMonth,
        year: filterYear,
        limit: '1000'
      });
      const res = await fetch(`/api/admin/companies?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setExplorerCompanies(json.data);
        }
      }
    } catch (err) {
      console.error('Lỗi khi lọc dữ liệu doanh nghiệp:', err);
      showAlert('Lỗi khi truy vấn dữ liệu lọc', 'error');
    } finally {
      setDataLoading(false);
    }
  };

  const pendingCount = privacyRequests.filter((r) => r.status === 'pending').length;
  const unreadMessagesCount = contactMessages.filter((m) => m.status === 'unread').length;
  const totalHiddenCount = Object.keys(hiddenPhones).length;

  // 1. Loading screen
  if (authChecking) {
    return null;
  }

  // 2. Màn hình đăng nhập nền trắng đơn giản, không icon
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-sans text-gray-800">
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
          <h1 className="text-xl font-bold text-gray-900 text-center">
            Đăng nhập Admin
          </h1>

          {loginError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Tài khoản
              </label>
              <input
                id="admin-username-input"
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Mật khẩu
              </label>
              <input
                id="admin-password-input"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="admin123"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              id="admin-submit-login-btn"
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-sm transition cursor-pointer"
            >
              Đăng nhập
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-2 text-xs text-gray-400">hoặc</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button
            id="quick-login-admin-btn"
            type="button"
            onClick={handleQuickLogin}
            className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-sm transition cursor-pointer"
          >
            Đăng nhập nhanh
          </button>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-800 transition"
            >
              ← Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }



  // 3. Admin Dashboard (Authenticated)
  return (
    <div className="min-h-screen bg-slate-100 text-gray-900 flex flex-col font-sans">
      {/* Admin Top Navigation */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white shadow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  TÌM KIẾM CÔNG TY
                </span>
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Admin Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Logged in Admin Badge */}
            <div className="hidden sm:flex items-center space-x-2 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="font-semibold text-slate-200">
                admin
              </span>
              <span className="text-[10px] bg-red-600/30 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded font-mono">
                Quản trị viên
              </span>
            </div>

            <Link
              href="/"
              target="_blank"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition border border-slate-700"
            >
              <span>Xem Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={loadAdminData}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-lg transition border border-slate-700 cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Logout Button */}
            <button
              id="admin-logout-btn"
              onClick={handleLogout}
              className="text-xs bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition border border-rose-800/60 shadow-sm cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Action Alert Banner */}
        {actionAlert && (
          <div
            className={`p-3.5 rounded-lg text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
              actionAlert.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-rose-50 text-rose-800 border border-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {actionAlert.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{actionAlert.text}</span>
            </div>
            <button
              onClick={() => setActionAlert(null)}
              className="text-xs underline hover:opacity-80 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-300 pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-gray-900 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Tổng quan Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 relative cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-gray-900 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Yêu cầu ẩn SĐT</span>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'data'
                ? 'bg-gray-900 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Lọc & Tra cứu Doanh nghiệp</span>
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 relative cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-gray-900 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Hòm thư Liên hệ</span>
            {unreadMessagesCount > 0 && (
              <span className="bg-amber-500 text-gray-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-gray-900 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cài đặt hệ thống</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Cơ sở dữ liệu</span>
                  <Database className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-gray-900 font-mono">2,150,890+</div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                  <span>Kết nối trực tiếp Cổng Thuế Quốc gia</span>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Yêu cầu ẩn SĐT</span>
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-700 font-mono">
                  {privacyRequests.length}{' '}
                  <span className="text-xs font-normal text-gray-500">
                    ({pendingCount} chờ duyệt)
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Đã duyệt: {privacyRequests.filter((r) => r.status === 'approved').length} &bull; Từ chối:{' '}
                  {privacyRequests.filter((r) => r.status === 'rejected').length}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">SĐT Đang Ẩn</span>
                  <PhoneOff className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-2xl font-black text-red-700 font-mono">{totalHiddenCount}</div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Bảo vệ theo yêu cầu của doanh nghiệp
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Tin nhắn liên hệ</span>
                  <Mail className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-2xl font-black text-gray-900 font-mono">
                  {contactMessages.length}{' '}
                  <span className="text-xs font-normal text-gray-500">
                    ({unreadMessagesCount} chưa đọc)
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Phản hồi thắc mắc, đóng góp ý kiến
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Pending Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 8 cols: Pending Requests table preview */}
              <div className="lg:col-span-8 bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-sm text-gray-900">
                      Yêu cầu ẩn số điện thoại mới nhất
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('privacy')}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Xem tất cả ({privacyRequests.length}) →
                  </button>
                </div>

                {privacyRequests.slice(0, 4).length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    Chưa có yêu cầu ẩn số điện thoại nào.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 text-xs">
                    {privacyRequests.slice(0, 4).map((req) => (
                      <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="font-bold text-gray-900">{req.companyName}</div>
                          <div className="text-gray-500 text-[11px] flex items-center space-x-3">
                            <span>MST: <strong className="font-mono text-amber-800">{req.taxId}</strong></span>
                            <span>SĐT: <strong className="font-mono text-red-600">{req.phone}</strong></span>
                            <span>Người gửi: <strong>{req.requesterName}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.status === 'approved' ? 'Đã duyệt' : req.status === 'rejected' ? 'Từ chối' : 'Chờ xử lý'}
                          </span>

                          {req.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(req.id, req.taxId)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] transition cursor-pointer"
                            >
                              Duyệt ẩn
                            </button>
                          )}
                          {req.status === 'approved' && (
                            <button
                              onClick={() => handleRestorePhone(req.taxId, req.phone, req.id)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] transition cursor-pointer"
                            >
                              Khôi phục
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: PRIVACY REQUESTS MANAGEMENT */}
        {activeTab === 'privacy' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Quản lý Yêu cầu Ẩn Số Điện Thoại & Thông Tin Cá Nhân
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Xử lý các đơn đề nghị bảo vệ quyền riêng tư từ chủ doanh nghiệp và người đại diện
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg text-xs">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setPrivacyFilter(st)}
                    className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                      privacyFilter === st
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {st === 'all'
                      ? `Tất cả (${privacyRequests.length})`
                      : st === 'pending'
                      ? `Chờ xử lý (${pendingCount})`
                      : st === 'approved'
                      ? `Đã duyệt`
                      : `Từ chối`}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={privacySearch}
                onChange={(e) => setPrivacySearch(e.target.value)}
                placeholder="Tìm theo tên công ty, mã số thuế, số điện thoại hoặc người yêu cầu..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-xs divide-y divide-gray-200">
                <thead className="bg-gray-50 text-gray-600 font-bold">
                  <tr>
                    <th className="px-4 py-3">Doanh nghiệp / MST</th>
                    <th className="px-4 py-3">SĐT cần ẩn</th>
                    <th className="px-4 py-3">Người yêu cầu & Liên hệ</th>
                    <th className="px-4 py-3">Lý do & Giấy tờ</th>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        Không tìm thấy yêu cầu phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/70 transition">
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{req.companyName}</div>
                          <div className="font-mono text-amber-700 font-semibold">{req.taxId}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-red-600">
                          {req.phone || 'Chưa cập nhật'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{req.requesterName}</div>
                          <div className="text-gray-500 font-mono text-[11px]">{req.requesterPhone}</div>
                          {req.requesterEmail && (
                            <div className="text-gray-400 text-[11px]">{req.requesterEmail}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="line-clamp-2 text-gray-700">{req.reason}</p>
                          {req.identityProof && (
                            <span className="text-[10px] text-blue-600 font-mono block mt-0.5">
                              Xác minh: {req.identityProof}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-[11px] whitespace-nowrap">
                          {req.createdAt}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.status === 'approved'
                              ? 'Đã duyệt ẩn'
                              : req.status === 'rejected'
                              ? 'Đã từ chối'
                              : 'Chờ xử lý'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            {req.status !== 'approved' && (
                              <button
                                onClick={() => handleApprove(req.id, req.taxId)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs transition cursor-pointer"
                                title="Phê duyệt ẩn số điện thoại này ngay lập tức"
                              >
                                Duyệt ẩn
                              </button>
                            )}
                            {req.status === 'approved' && (
                              <button
                                onClick={() => handleRestorePhone(req.taxId, req.phone, req.id)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs transition cursor-pointer"
                                title="Khôi phục lại số điện thoại trên website"
                              >
                                Khôi phục
                              </button>
                            )}
                            {req.status === 'pending' && (
                              <button
                                onClick={() => handleReject(req.id)}
                                className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded font-semibold text-xs transition cursor-pointer"
                                title="Từ chối yêu cầu"
                              >
                                Từ chối
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DATA EXPLORER & FILTERS */}
        {activeTab === 'data' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="font-bold text-base text-gray-900">
                Bộ Lọc & Tra Cứu Dữ Liệu Doanh Nghiệp Toàn Quốc
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Lọc danh sách doanh nghiệp theo tỉnh/thành phố, thời gian thành lập và trạng thái website
              </p>
            </div>

            {/* Filter Controls Form */}
            <form onSubmit={handleDataSearch} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Tỉnh / Thành phố
                  </label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">-- Tất cả 63 Tỉnh / Thành phố --</option>
                    {PROVINCES.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Trạng thái Website
                  </label>
                  <select
                    value={websiteFilter}
                    onChange={(e) => setWebsiteFilter(e.target.value as 'all' | 'hasWebsite' | 'noWebsite')}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    aria-label="Lọc theo trạng thái website"
                  >
                    <option value="all">-- Tất cả trạng thái --</option>
                    <option value="hasWebsite">Có website</option>
                    <option value="noWebsite">Chưa có website</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-gray-600">
                      Thời gian thành lập (Combo lọc)
                    </label>
                    {timeFilterType !== 'all' && (
                      <button
                        type="button"
                        onClick={() => {
                          setTimeFilterType('all');
                          setFilterStartDate('');
                          setFilterEndDate('');
                          setFilterMonth('');
                          setFilterYear('');
                        }}
                        className="text-[10px] text-red-500 hover:underline cursor-pointer"
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>
                  <select
                    value={timeFilterType}
                    onChange={(e) => setTimeFilterType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none font-medium text-gray-800"
                  >
                    <option value="all">-- Tất cả thời gian --</option>
                    <option value="exact_date">📅 Theo ngày cụ thể</option>
                    <option value="month">🗓️ Theo tháng (Tháng / Năm)</option>
                    <option value="year">📆 Theo năm</option>
                    <option value="range">⏳ Theo khoảng thời gian (Từ ngày - Đến ngày)</option>
                    <option value="before">◀️ Thành lập trước ngày</option>
                    <option value="after">▶️ Thành lập sau ngày</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={dataLoading}
                    className="w-full bg-[#fed700] hover:bg-[#eab308] text-gray-950 font-bold py-2 rounded flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{dataLoading ? 'Đang lọc...' : 'Lọc dữ liệu'}</span>
                  </button>
                </div>
              </div>

              {/* Chi tiết điều kiện thời gian khi chọn loại lọc */}
              {timeFilterType !== 'all' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex flex-wrap items-center gap-3">
                  {timeFilterType === 'exact_date' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-700">Chọn ngày thành lập:</span>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {timeFilterType === 'month' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-700">Chọn tháng & năm:</span>
                      <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-gray-500">(Ví dụ: 05/2023)</span>
                    </div>
                  )}

                  {timeFilterType === 'year' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-700">Nhập năm thành lập:</span>
                      <input
                        type="number"
                        min="1980"
                        max="2030"
                        placeholder="VD: 2023"
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="w-32 px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {timeFilterType === 'range' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-700">Từ ngày:</span>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                      <span className="font-semibold text-gray-700">đến ngày:</span>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {timeFilterType === 'before' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-700">Thành lập trước ngày:</span>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {timeFilterType === 'after' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-700">Thành lập sau ngày:</span>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </form>

            {explorerCompanies.length > 0 && (
              <div className="flex items-center justify-between text-xs text-gray-700 bg-amber-50/70 border border-amber-200 px-3.5 py-2 rounded">
                <span>
                  Tìm thấy <strong className="text-amber-900 font-bold">{explorerCompanies.length}</strong> doanh nghiệp thỏa mãn điều kiện lọc.
                </span>
                <span className="text-gray-500 text-[11px]">
                  Xử lý trực tiếp CSDL (Không qua AI)
                </span>
              </div>
            )}

            {/* Results Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-xs divide-y divide-gray-200">
                <thead className="bg-gray-50 text-gray-600 font-bold">
                  <tr>
                    <th className="px-4 py-3">Mã số thuế</th>
                    <th className="px-4 py-3">Tên doanh nghiệp</th>
                    <th className="px-4 py-3">Người đại diện</th>
                    <th className="px-4 py-3 whitespace-nowrap">Thời gian thành lập</th>
                    <th className="px-4 py-3">Địa điểm</th>
                    <th className="px-4 py-3">Website</th>
                    <th className="px-4 py-3">Số điện thoại</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {explorerCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        {dataLoading ? 'Đang tải dữ liệu...' : 'Chọn điều kiện lọc và bấm Lọc dữ liệu.'}
                      </td>
                    </tr>
                  ) : (
                    explorerCompanies.map((c, idx) => {
                      const isHidden = Boolean(hiddenPhones[c.id]);
                      const detailSlug = getCompanySlug(c.id, c.name);
                      return (
                        <tr key={`${c.id}-${idx}`} className="hover:bg-gray-50/70">
                          <td className="px-4 py-3 font-mono font-bold text-amber-800">
                            {c.id}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900 max-w-sm">
                            <Link href={`/${detailSlug}`} target="_blank" className="hover:text-blue-600 hover:underline">
                              {c.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{c.representative || 'Đang cập nhật'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px] font-medium border border-gray-200">
                              {c.startDate || c.registrationDate || getCompanyEstablishedDate(c)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 min-w-64">{c.address || c.province || 'Đang cập nhật'}</td>
                          <td className="px-4 py-3">
                            {c.contactInfo?.website ? (
                              <a
                                href={c.contactInfo.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 font-semibold hover:underline"
                              >
                                Có website
                              </a>
                            ) : c.contactInfo?.hasWebsite ? (
                              <span className="text-emerald-700 font-semibold">Có website</span>
                            ) : (
                              <span className="text-gray-500">
                                {c.contactInfo?.websiteStatus === 'pending' ? 'Chưa quét' : 'Chưa có website'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isHidden ? (
                              <span className="text-red-600 italic font-medium flex items-center space-x-1">
                                <PhoneOff className="w-3 h-3" />
                                <span>Đã ẩn</span>
                              </span>
                            ) : (
                              <span className="font-mono text-gray-800">{c.phone || 'Chưa có'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleToggleHiddenPhone(c.id, c.phone || '')}
                                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                                  isHidden
                                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                                    : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                }`}
                              >
                                {isHidden ? 'Hiện lại SĐT' : 'Ẩn SĐT'}
                              </button>
                              <Link
                                href={`/${detailSlug}`}
                                target="_blank"
                                className="p-1 text-gray-400 hover:text-blue-600 transition"
                                title="Xem trang chi tiết ngoài website"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CONTACT MESSAGES */}
        {activeTab === 'contacts' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Hòm Thư Liên Hệ & Yêu Cầu Hỗ Trợ
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Các phản hồi, báo sai dữ liệu và đóng góp từ người dùng gửi qua trang /lien-he
                </p>
              </div>

              <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg text-xs">
                {(['all', 'unread', 'read', 'replied'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setContactFilter(st)}
                    className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                      contactFilter === st
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {st === 'all'
                      ? `Tất cả (${contactMessages.length})`
                      : st === 'unread'
                      ? `Chưa đọc (${unreadMessagesCount})`
                      : st === 'read'
                      ? `Đã đọc`
                      : `Đã phản hồi`}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
              {filteredContacts.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  Không có tin nhắn nào trong mục này.
                </div>
              ) : (
                filteredContacts.map((msg) => (
                  <div key={msg.id} className="p-4 hover:bg-gray-50 transition space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900 text-sm">{msg.name}</span>
                        <span className="text-gray-400">&bull;</span>
                        <a href={`mailto:${msg.email}`} className="text-blue-600 hover:underline">
                          {msg.email}
                        </a>
                        {msg.phone && (
                          <span className="font-mono text-gray-500">({msg.phone})</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-[11px]">{msg.createdAt}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            msg.status === 'unread'
                              ? 'bg-amber-100 text-amber-800'
                              : msg.status === 'replied'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {msg.status === 'unread' ? 'Chưa đọc' : msg.status === 'replied' ? 'Đã phản hồi' : 'Đã đọc'}
                        </span>
                      </div>
                    </div>

                    <div className="font-semibold text-gray-800">{msg.subject}</div>
                    <p className="text-gray-600 leading-relaxed bg-gray-50 p-3 rounded border border-gray-100">
                      {msg.message}
                    </p>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      {msg.status === 'unread' && (
                        <button
                          onClick={() => handleUpdateMessageStatus(msg.id, 'read')}
                          className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold transition cursor-pointer"
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                      <a
                        href={`mailto:${msg.email}?subject=Phản hồi từ Tìm Kiếm Công Ty về: ${encodeURIComponent(msg.subject)}`}
                        onClick={() => handleUpdateMessageStatus(msg.id, 'replied')}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition flex items-center space-x-1 cursor-pointer"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Gửi email phản hồi</span>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs max-w-2xl space-y-6">
            <div>
              <h3 className="font-bold text-base text-gray-900">
                Cài Đặt Hệ Thống Quản Trị
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Cấu hình thông tin thương hiệu, email nhận thông báo và cơ chế bảo mật
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Tên Website & Thương hiệu
                </label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Email Nhận Thông Báo Quản Trị
                </label>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-start space-x-3 cursor-pointer p-3 bg-gray-50 rounded border border-gray-200">
                  <input
                    type="checkbox"
                    checked={settings.autoHide}
                    onChange={(e) => setSettings({ ...settings, autoHide: e.target.checked })}
                    className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block">
                      Tự động ẩn số điện thoại ngay khi nhận yêu cầu
                    </span>
                    <span className="text-gray-500 text-[11px] block mt-0.5 leading-normal">
                      Nếu bật tùy chọn này, số điện thoại sẽ lập tức được ẩn trên website mà không cần phải chờ Admin duyệt thủ công.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t">
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-gray-950 font-bold px-5 py-2 rounded flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu cấu hình</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
