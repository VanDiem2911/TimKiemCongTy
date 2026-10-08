'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Mail,
  Search,
  CheckCircle2,
  PhoneOff,
  Filter,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Database,
  AlertTriangle,
  Lock,
  User,
  LogOut,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PROVINCES, getCompanySlug, normalizeTaxId } from '@/lib/constants';
import { PrivacyRequest, ContactMessage, HiddenPhoneRecord } from '@/lib/privacyStore';
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


const DATA_PAGE_SIZE = 500;

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'privacy' | 'data' | 'contacts'>('overview');
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Authentication State (Đơn giản, tức thì)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Store data
  const [privacyRequests, setPrivacyRequests] = useState<PrivacyRequest[]>([]);
  const [hiddenPhones, setHiddenPhones] = useState<Record<string, HiddenPhoneRecord>>({});
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);

  // Action status message
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Privacy tab filters
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [privacySearch, setPrivacySearch] = useState('');

  // Data Explorer tab filters
  const [filterTaxId, setFilterTaxId] = useState('');
  const [filterName, setFilterName] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState<'all' | 'hasWebsite' | 'noWebsite'>('all');
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'hasPhone' | 'noPhone'>('all');
  const [timeFilterType, setTimeFilterType] = useState<
    'all' | 'exact_date' | 'month' | 'year' | 'range' | 'before' | 'after'
  >('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const [explorerCompanies, setExplorerCompanies] = useState<BusinessTaxInfo[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [dataCurrentPage, setDataCurrentPage] = useState(1);
  const dataTableTopRef = useRef<HTMLDivElement | null>(null);

  // Manual hide phone modal in Admin
  const [manualTaxId, setManualTaxId] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  // Contact tab filter
  const [contactFilter, setContactFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Crawler State
  const [crawlerStats, setCrawlerStats] = useState<{
    total: number;
    provincesCount: number;
    withDateCount: number;
    withPhoneCount: number;
  }>({ total: 0, provincesCount: 0, withDateCount: 0, withPhoneCount: 0 });
  const [crawlerRunning, setCrawlerRunning] = useState(false);
  const [crawlerPercent, setCrawlerPercent] = useState(0);
  const [crawlerMessage, setCrawlerMessage] = useState('');

  const loadCrawlerStats = async () => {
    try {
      const res = await fetch('/api/admin/crawler');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (json.stats) setCrawlerStats(json.stats);
          if (json.crawler) {
            setCrawlerRunning(json.crawler.isRunning);
            setCrawlerPercent(json.crawler.percent);
            setCrawlerMessage(json.crawler.message);
          }
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (crawlerRunning) {
      timer = setInterval(() => {
        loadCrawlerStats();
      }, 2000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [crawlerRunning]);

  const handleStartCrawl = async (target: number) => {
    try {
      setCrawlerRunning(true);
      setCrawlerMessage(`Đang bắt đầu cào mục tiêu ${target.toLocaleString('vi-VN')} doanh nghiệp thật (kèm SĐT & Ngày)...`);
      const res = await fetch('/api/admin/crawler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', target, enrich: true }),
      });
      const json = await res.json();
      if (json.success) {
        showAlert(json.message);
      } else {
        showAlert(json.message, 'error');
      }
    } catch (_err: unknown) {
      showAlert('Lỗi khi kích hoạt cào dữ liệu', 'error');
    }
  };

  const handleStartEnrich = async (target: number = 3000) => {
    try {
      setCrawlerRunning(true);
      setCrawlerMessage('Đang bổ sung SĐT & Ngày cho các doanh nghiệp hiện có trong kho...');
      const res = await fetch('/api/admin/crawler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enrich', target }),
      });
      const json = await res.json();
      if (json.success) {
        showAlert(json.message);
      } else {
        showAlert(json.message, 'error');
      }
    } catch (_err: unknown) {
      showAlert('Lỗi khi kích hoạt bổ sung dữ liệu', 'error');
    }
  };

  const handleStopCrawl = async () => {
    try {
      await fetch('/api/admin/crawler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      setCrawlerRunning(false);
      setCrawlerMessage('Đã dừng tiến trình.');
      showAlert('Đã dừng tiến trình cào dữ liệu.');
    } catch (_e) {
      showAlert('Lỗi khi dừng cào', 'error');
    }
  };

  // Hỏi máy chủ xem phiên đăng nhập còn hiệu lực không.
  // Trước đây chỉ đọc localStorage, nghĩa là ai cũng tự đặt được cờ đó để vào.
  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const res = await fetch('/api/admin/auth');
        if (cancelled) return;
        if (res.ok) {
          setIsAuthenticated(true);
          loadAdminData();
          loadCrawlerStats();
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    };

    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Ghi nhớ trạng thái thu gọn của thanh điều hướng
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('admin_sidebar_collapsed') === 'true') {
        setSidebarCollapsed(true);
      }
    } catch (e) {}
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_sidebar_collapsed', String(next));
        }
      } catch (e) {}
      return next;
    });
  };

  // Đăng nhập qua máy chủ để nhận cookie phiên. Không còn tự đặt cờ ở trình
  // duyệt nữa, vì các API quản trị giờ bắt buộc phải có cookie này.
  const requestLogin = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });

      if (res.ok) {
        setLoginError('');
        setIsAuthenticated(true);
        loadAdminData();
        loadCrawlerStats();
        return true;
      }

      setLoginError('Sai tài khoản hoặc mật khẩu.');
      return false;
    } catch (err) {
      console.error(err);
      setLoginError('Không kết nối được máy chủ, vui lòng thử lại.');
      return false;
    }
  };

  // Đăng nhập bằng mật khẩu
  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    requestLogin(loginUsername.trim(), loginPassword.trim());
  };

  // Đăng xuất: xóa cookie phiên ở máy chủ
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch (e) {
      console.error(e);
    }
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
          let messages = json.data.contactMessages || [];
          try {
            if (typeof window !== 'undefined') {
              const saved = localStorage.getItem('admin_msg_status_overrides');
              if (saved) {
                const overrides = JSON.parse(saved);
                messages = messages.map((m: ContactMessage) =>
                  overrides[m.id] ? { ...m, status: overrides[m.id] } : m
                );
              }
            }
          } catch {}

          setPrivacyRequests(json.data.privacyRequests || []);
          setHiddenPhones(json.data.hiddenPhones || {});
          setContactMessages(messages);
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
    // 1. Cập nhật giao diện ngay lập tức (Optimistic UI)
    setContactMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, status } : m))
    );

    // 2. Lưu vào localStorage để không bao giờ bị mất trạng thái
    try {
      if (typeof window !== 'undefined') {
        const saved = JSON.parse(localStorage.getItem('admin_msg_status_overrides') || '{}');
        saved[msgId] = status;
        localStorage.setItem('admin_msg_status_overrides', JSON.stringify(saved));
      }
    } catch {}

    // 3. Gửi đồng bộ lên máy chủ / MongoDB
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_message_status', msgId, status }),
      });
      if (res.ok) {
        showAlert('Đã cập nhật trạng thái tin nhắn thành công!');
      }
    } catch (err) {
      console.error(err);
      showAlert('Lỗi khi cập nhật tin nhắn', 'error');
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
      if (contactFilter === 'unread') return msg.status === 'unread';
      if (contactFilter === 'read') return msg.status !== 'unread';
      return msg.status === contactFilter;
    });
  }, [contactMessages, contactFilter]);

  // Company Data Explorer: Lọc trực tiếp siêu nhanh trong CSDL (không dùng AI, chuẩn xác 100%)
  // Hỗ trợ combo lọc: theo ngày cụ thể, theo tháng, theo năm, theo khoảng thời gian, trước/sau ngày
  const handleDataSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDataLoading(true);
    setHasSearched(true);
    try {
      const province = selectedProvince || 'all';
      const params = new URLSearchParams({
        taxId: filterTaxId.trim(),
        q: filterName.trim(),
        province,
        website: websiteFilter,
        phone: phoneFilter,
        timeType: timeFilterType,
        startDate: filterStartDate ? parseDateToISO(filterStartDate) : '',
        endDate: filterEndDate ? parseDateToISO(filterEndDate) : '',
        beforeDate: timeFilterType === 'before' && filterStartDate ? parseDateToISO(filterStartDate) : '',
        month: filterMonth,
        year: filterYear,
        limit: '10000'
      });
      const res = await fetch(`/api/admin/companies?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setExplorerCompanies(json.data);
          setDataCurrentPage(1);
        }
      }
    } catch (err) {
      console.error('Lỗi khi lọc dữ liệu doanh nghiệp:', err);
      showAlert('Lỗi khi truy vấn dữ liệu lọc', 'error');
    } finally {
      setDataLoading(false);
    }
  };

  // Chuyển trang và tự động cuộn lên đầu bảng danh sách
  const handleDataPageChange = (newPage: number) => {
    const totalPages = Math.max(1, Math.ceil(explorerCompanies.length / DATA_PAGE_SIZE));
    setDataCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
    if (dataTableTopRef.current) {
      dataTableTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Tự động tải trước danh sách doanh nghiệp khi người dùng chuyển sang tab Data
  useEffect(() => {
    if (activeTab === 'data' && explorerCompanies.length === 0 && !hasSearched && !dataLoading) {
      handleDataSearch();
    }
  }, [activeTab]);

  const pendingCount = privacyRequests.filter((r) => r.status === 'pending').length;
  const unreadMessagesCount = contactMessages.filter((m) => m.status === 'unread').length;
  const totalHiddenCount = Object.keys(hiddenPhones).length;

  const navItems = [
    {
      key: 'overview' as const,
      label: 'Tổng quan Dashboard',
      icon: SlidersHorizontal,
      badge: 0,
      badgeClass: '',
      title: 'Tổng quan Dashboard',
      subtitle: 'Quản lý dữ liệu và yêu cầu trên hệ thống Tìm Kiếm Công Ty',
    },
    {
      key: 'privacy' as const,
      label: 'Yêu cầu ẩn SĐT',
      icon: ShieldAlert,
      badge: pendingCount,
      badgeClass: 'bg-rose-500 text-white',
      title: 'Yêu cầu ẩn số điện thoại',
      subtitle: 'Xử lý đơn đề nghị bảo vệ quyền riêng tư từ chủ doanh nghiệp',
    },
    {
      key: 'data' as const,
      label: 'Lọc & Tra cứu Doanh nghiệp',
      icon: Database,
      badge: 0,
      badgeClass: '',
      title: 'Lọc & Tra cứu Doanh nghiệp',
      subtitle: 'Tra cứu kho dữ liệu doanh nghiệp toàn quốc theo nhiều tiêu chí',
    },
    {
      key: 'contacts' as const,
      label: 'Hòm thư Liên hệ',
      icon: Mail,
      badge: unreadMessagesCount,
      badgeClass: 'bg-amber-400 text-slate-900',
      title: 'Hòm thư Liên hệ',
      subtitle: 'Phản hồi thắc mắc và đóng góp ý kiến từ người dùng',
    },
  ];

  const activeNav = navItems.find((item) => item.key === activeTab) || navItems[0];

  const totalDataPages = Math.max(1, Math.ceil(explorerCompanies.length / DATA_PAGE_SIZE));
  const safeDataPage = Math.min(dataCurrentPage, totalDataPages);
  const dataStartIndex = (safeDataPage - 1) * DATA_PAGE_SIZE;
  const paginatedCompanies = explorerCompanies.slice(dataStartIndex, dataStartIndex + DATA_PAGE_SIZE);

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
                placeholder="Nhập mật khẩu quản trị"
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Admin Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/" className="inline-flex items-center space-x-2.5 group min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#dc2626] to-[#ef4444] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Search className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-black tracking-tight text-gray-900 leading-none truncate">
                  TÌM KIẾM <span className="text-[#e91a2c]">CÔNG TY</span>
                </span>
                <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase font-mono mt-0.5">
                  TIMKIEMCONGTY.COM
                </span>
              </div>
            </Link>
            <span className="hidden sm:inline bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide shrink-0">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Logged in Admin Badge */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-slate-700">admin</span>
              <span className="text-slate-400">Quản trị viên</span>
            </div>

            <button
              onClick={loadAdminData}
              className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg transition cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              href="/"
              target="_blank"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
            >
              <span className="hidden sm:inline">Xem Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            {/* Đăng xuất nằm ở chân thanh điều hướng; màn hình nhỏ không có sidebar nên giữ lại ở đây */}
            <button
              onClick={handleLogout}
              className="lg:hidden text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex flex-1 w-full">
        {/* Sidebar Navigation */}
        <aside
          className={`hidden lg:flex flex-col shrink-0 self-start bg-white border-r border-slate-200 sticky top-16 h-[calc(100vh-4rem)] transition-[width] duration-200 ${
            sidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          <nav className="flex-1 overflow-y-auto flex flex-col gap-1 px-3 py-5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 py-3 rounded-xl text-sm font-semibold transition cursor-pointer text-left relative ${
                    sidebarCollapsed ? 'justify-center px-0' : 'px-4'
                  } ${
                    isActive
                      ? 'bg-rose-50 text-rose-600'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-rose-500' : 'text-slate-400'}`} />
                  {!sidebarCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {item.badge > 0 &&
                    (sidebarCollapsed ? (
                      <span
                        className={`absolute top-2 right-3.5 w-2 h-2 rounded-full ${
                          item.badgeClass.includes('amber') ? 'bg-amber-400' : 'bg-rose-500'
                        }`}
                      />
                    ) : (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                    ))}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 px-3 py-3 flex flex-col gap-1">
            <button
              id="admin-logout-btn"
              onClick={handleLogout}
              title={sidebarCollapsed ? 'Đăng xuất' : undefined}
              className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-4'
              }`}
            >
              <LogOut className="w-5 h-5 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span className="truncate">Đăng xuất</span>}
            </button>

          </div>

          {/* Nút tròn thu gọn / mở rộng gắn ở mép phải sidebar */}
          <button
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            aria-label={sidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer z-10"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 space-y-6">
        {/* Mobile Navigation */}
        <div className="lg:hidden flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${item.badgeClass}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Page Heading */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{activeNav.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{activeNav.subtitle}</p>
        </div>

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

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 leading-tight">
                    Cơ sở dữ liệu
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  {crawlerStats.total.toLocaleString('vi-VN')}
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-2">
                  Doanh nghiệp đang có trong kho dữ liệu
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 leading-tight">
                    Yêu cầu ẩn SĐT
                  </span>
                </div>
                <div className="text-3xl font-black text-amber-600">
                  {privacyRequests.length}{' '}
                  <span className="text-xs font-normal text-slate-500">({pendingCount} chờ duyệt)</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Đã duyệt: {privacyRequests.filter((r) => r.status === 'approved').length} &bull; Từ chối:{' '}
                  {privacyRequests.filter((r) => r.status === 'rejected').length}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <PhoneOff className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 leading-tight">
                    SĐT đang ẩn
                  </span>
                </div>
                <div className="text-3xl font-black text-rose-600">{totalHiddenCount}</div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Bảo vệ theo yêu cầu của doanh nghiệp
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 leading-tight">
                    Tin nhắn liên hệ
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  {contactMessages.length}{' '}
                  <span className="text-xs font-normal text-slate-500">({unreadMessagesCount} chưa đọc)</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Bộ Lọc & Tra Cứu Dữ Liệu Doanh Nghiệp Toàn Quốc
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lọc danh sách doanh nghiệp theo tỉnh/thành phố, thời gian thành lập và trạng thái website
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-medium">
                  Kho dữ liệu: {crawlerStats.total.toLocaleString('vi-VN')} DN
                </span>
                <button
                  type="button"
                  onClick={loadCrawlerStats}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  title="Làm mới thống kê"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CÔNG CỤ CÀO DỮ LIỆU - COOL SLATE THEME */}
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-4 text-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      Công Cụ Thu Thập Dữ Liệu Tự Động
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">Masothue Scraper</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Đồng bộ MST, Tên doanh nghiệp, Người đại diện và Địa chỉ từ Cổng thông tin 63 tỉnh thành.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/80 font-medium flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Mặc định lấy đầy đủ SĐT & Ngày</span>
                  </span>
                  <button
                    type="button"
                    disabled={crawlerRunning}
                    onClick={() => handleStartEnrich(3000)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 disabled:opacity-50 font-medium rounded-lg shadow-2xs transition cursor-pointer flex items-center space-x-1.5 text-xs"
                    title="Bổ sung SĐT và Ngày thành lập thật cho các công ty đã cào trước đây mà chưa có"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-700" />
                    <span>Bổ sung SĐT & Ngày cho kho hiện có</span>
                  </button>
                  <button
                    type="button"
                    disabled={crawlerRunning}
                    onClick={() => handleStartCrawl(crawlerStats.total + 5000)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 text-white font-medium rounded-lg shadow-2xs transition cursor-pointer flex items-center space-x-1.5 text-xs"
                  >
                    <span>+ Cào thêm 5.000 DN</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tiến trình cào dữ liệu khi đang chạy */}
              {crawlerRunning && (
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-slate-800">
                    <span className="flex items-center gap-2 text-sky-700">
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping inline-block" />
                      {crawlerMessage || 'Đang thu thập dữ liệu...'}
                    </span>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-slate-700">{crawlerPercent}%</span>
                      <button
                        type="button"
                        onClick={handleStopCrawl}
                        className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-medium transition cursor-pointer"
                      >
                        Dừng lại
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(5, crawlerPercent)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Filter Controls Form */}
            <form onSubmit={handleDataSearch} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                {/* 1. Lọc theo Mã số thuế (MST) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Mã số thuế (MST)
                    </label>
                    {filterTaxId && (
                      <button
                        type="button"
                        onClick={() => setFilterTaxId('')}
                        className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={filterTaxId}
                      onChange={(e) => setFilterTaxId(e.target.value)}
                      placeholder="Nhập MST..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none font-mono text-xs placeholder:text-slate-400 font-medium transition"
                    />
                  </div>
                </div>

                {/* 2. Lọc theo Tên doanh nghiệp / Người đại diện */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Tên DN / Đại diện
                    </label>
                    {filterName && (
                      <button
                        type="button"
                        onClick={() => setFilterName('')}
                        className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="Tên công ty hoặc đại diện..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none text-xs placeholder:text-slate-400 font-medium transition"
                    />
                  </div>
                </div>

                {/* 3. Lọc theo Tỉnh / Thành phố */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tỉnh / Thành phố
                  </label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    aria-label="Lọc theo tỉnh thành phố"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition cursor-pointer"
                  >
                    <option value="">-- Tất cả 63 Tỉnh --</option>
                    {PROVINCES.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Lọc theo Số điện thoại */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <select
                    value={phoneFilter}
                    onChange={(e) => setPhoneFilter(e.target.value as 'all' | 'hasPhone' | 'noPhone')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition cursor-pointer font-medium"
                    aria-label="Lọc theo trạng thái số điện thoại"
                  >
                    <option value="all">-- Tất cả --</option>
                    <option value="hasPhone">📞 Có số điện thoại</option>
                    <option value="noPhone">📵 Chưa có số điện thoại</option>
                  </select>
                </div>

                {/* 5. Lọc theo Trạng thái Website */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Trạng thái Website
                  </label>
                  <select
                    value={websiteFilter}
                    onChange={(e) => setWebsiteFilter(e.target.value as 'all' | 'hasWebsite' | 'noWebsite')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition cursor-pointer"
                    aria-label="Lọc theo trạng thái website"
                  >
                    <option value="all">-- Tất cả --</option>
                    <option value="hasWebsite">Có website</option>
                    <option value="noWebsite">Chưa có website</option>
                  </select>
                </div>

                {/* 6. Lọc theo Thời gian thành lập */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700 truncate">
                      Thời gian thành lập
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
                        className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>
                  <select
                    value={timeFilterType}
                    aria-label="Lọc theo thời gian thành lập"
                    onChange={(e) =>
                      setTimeFilterType(
                        e.target.value as 'all' | 'exact_date' | 'month' | 'year' | 'range' | 'before' | 'after'
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none font-medium text-slate-800 transition cursor-pointer"
                  >
                    <option value="all">-- Tất cả thời gian --</option>
                    <option value="exact_date">Theo ngày</option>
                    <option value="month">Theo tháng</option>
                    <option value="year">Theo năm</option>
                    <option value="range">Khoảng ngày</option>
                    <option value="before">Trước ngày</option>
                    <option value="after">Sau ngày</option>
                  </select>
                </div>
              </div>

              {/* Chi tiết điều kiện thời gian khi chọn loại lọc */}
              {timeFilterType !== 'all' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center gap-3">
                  {timeFilterType === 'exact_date' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-700">Chọn ngày thành lập:</span>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {timeFilterType === 'month' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-700">Chọn tháng & năm:</span>
                      <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-500">(Ví dụ: 05/2023)</span>
                    </div>
                  )}

                  {timeFilterType === 'year' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-700">Nhập năm thành lập:</span>
                      <input
                        type="number"
                        min="1980"
                        max="2030"
                        placeholder="VD: 2023"
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="w-32 px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {timeFilterType === 'range' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-700">Từ ngày:</span>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none"
                      />
                      <span className="font-semibold text-slate-700">đến ngày:</span>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {timeFilterType === 'before' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-700">Thành lập trước ngày:</span>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {timeFilterType === 'after' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-700">Thành lập sau ngày:</span>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Nút Lọc dữ liệu */}
              <div className="pt-1 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={dataLoading}
                  className="bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-medium px-5 py-2 rounded-lg flex items-center space-x-2 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{dataLoading ? 'Đang lọc dữ liệu...' : 'Lọc dữ liệu'}</span>
                </button>

                {(filterTaxId || filterName || selectedProvince || websiteFilter !== 'all' || phoneFilter !== 'all' || timeFilterType !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterTaxId('');
                      setFilterName('');
                      setSelectedProvince('');
                      setWebsiteFilter('all');
                      setPhoneFilter('all');
                      setTimeFilterType('all');
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setFilterMonth('');
                      setFilterYear('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Xóa tất cả bộ lọc
                  </button>
                )}
              </div>
            </form>

            {explorerCompanies.length > 0 && (
              <div
                ref={dataTableTopRef}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700 bg-slate-100 border border-slate-200 px-3.5 py-2.5 rounded-lg scroll-mt-24"
              >
                <span>
                  Tìm thấy <strong className="text-slate-900 font-bold">{explorerCompanies.length.toLocaleString('vi-VN')}</strong> doanh nghiệp thỏa mãn điều kiện lọc.
                  <span className="text-slate-500 ml-1.5 font-normal">
                    (Hiển thị <strong>{dataStartIndex + 1} - {Math.min(dataStartIndex + DATA_PAGE_SIZE, explorerCompanies.length)}</strong> / {explorerCompanies.length.toLocaleString('vi-VN')} DN)
                  </span>
                </span>
                <span className="text-slate-600 font-medium">
                  Trang <strong>{safeDataPage}</strong> / <strong>{totalDataPages}</strong> (500 DN / trang)
                </span>
              </div>
            )}

            {/* Results Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
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
                <tbody className="divide-y divide-slate-100">
                  {explorerCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          {dataLoading ? (
                            <>
                              <RefreshCw className="w-7 h-7 text-sky-600 animate-spin" />
                              <p className="font-semibold text-slate-800 text-sm">
                                Đang truy vấn dữ liệu từ hệ thống...
                              </p>
                              <p className="text-xs text-slate-400">
                                Vui lòng chờ giây lát, đang đối chiếu các tiêu chí lọc.
                              </p>
                            </>
                          ) : hasSearched ? (
                            <>
                              <Search className="w-8 h-8 text-slate-300" />
                              <p className="font-semibold text-slate-800 text-sm">
                                Không tìm thấy doanh nghiệp nào phù hợp
                              </p>
                              <p className="text-xs text-slate-400 max-w-sm">
                                Hãy thử đổi lại mốc thời gian hoặc chọn &quot;-- Tất cả 63 Tỉnh --&quot; để mở rộng phạm vi tìm kiếm.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterTaxId('');
                                  setFilterName('');
                                  setSelectedProvince('');
                                  setWebsiteFilter('all');
                                  setPhoneFilter('all');
                                  setTimeFilterType('all');
                                  setFilterStartDate('');
                                  setFilterEndDate('');
                                  setFilterMonth('');
                                  setFilterYear('');
                                  fetch('/api/admin/companies?limit=10000')
                                    .then((r) => r.json())
                                    .then((d) => {
                                      if (d.success && d.data) {
                                        setExplorerCompanies(d.data);
                                        setDataCurrentPage(1);
                                      }
                                    });
                                }}
                                className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition cursor-pointer"
                              >
                                Đặt lại toàn bộ bộ lọc
                              </button>
                            </>
                          ) : (
                            <>
                              <Search className="w-8 h-8 text-slate-300" />
                              <p className="font-medium text-slate-700 text-sm">
                                Đang chuẩn bị danh sách doanh nghiệp...
                              </p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCompanies.map((c, idx) => {
                      const isHidden = Boolean(hiddenPhones[c.id]);
                      const detailSlug = getCompanySlug(c.id, c.name);
                      return (
                        <tr key={`${c.id}-${dataStartIndex + idx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-[#e91a2c] whitespace-nowrap">
                            <span className="bg-[#fff0f1] px-2 py-0.5 rounded border border-[#fecdd3] whitespace-nowrap inline-block">
                              {normalizeTaxId(c.id)}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900 max-w-sm">
                            <Link href={`/${detailSlug}`} target="_blank" className="hover:text-blue-600 hover:underline">
                              {c.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{c.representative || 'Đang cập nhật'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {c.startDate || c.registrationDate ? (
                              <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px] font-medium border border-gray-200">
                                {c.startDate || c.registrationDate}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Chưa có</span>
                            )}
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
                            ) : (c.phone || c.contactInfo?.phone) ? (
                              <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-semibold text-[11px] inline-flex items-center gap-1">
                                <span>{c.phone || c.contactInfo?.phone}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Chưa có SĐT</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleToggleHiddenPhone(c.id, c.phone || c.contactInfo?.phone || '')}
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

            {/* Pagination Controls */}
            {explorerCompanies.length > 0 && (
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="text-slate-600">
                    Đang hiển thị <strong>{dataStartIndex + 1} - {Math.min(dataStartIndex + DATA_PAGE_SIZE, explorerCompanies.length)}</strong> trong tổng số <strong>{explorerCompanies.length.toLocaleString('vi-VN')}</strong> doanh nghiệp (Trang {safeDataPage}/{totalDataPages})
                  </div>

                  {totalDataPages > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      <button
                        type="button"
                        onClick={() => handleDataPageChange(safeDataPage - 1)}
                        disabled={safeDataPage <= 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer font-medium text-slate-700 shadow-2xs transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Trang trước</span>
                      </button>

                      {Array.from({ length: totalDataPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalDataPages || Math.abs(p - safeDataPage) <= 2)
                        .map((p, idx, arr) => {
                          const prev = arr[idx - 1];
                          return (
                            <React.Fragment key={p}>
                              {prev && p - prev > 1 && <span className="px-1 text-slate-400 select-none">...</span>}
                              <button
                                type="button"
                                onClick={() => handleDataPageChange(p)}
                                className={`min-w-8 h-8 px-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                                  p === safeDataPage
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                {p}
                              </button>
                            </React.Fragment>
                          );
                        })}

                      <button
                        type="button"
                        onClick={() => handleDataPageChange(safeDataPage + 1)}
                        disabled={safeDataPage >= totalDataPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer font-medium text-slate-700 shadow-2xs transition-colors"
                      >
                        <span>Trang sau</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                {(['all', 'unread', 'read'] as const).map((st) => (
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
                      : `Đã đọc (${contactMessages.filter((m) => m.status !== 'unread').length})`}
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
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {msg.status === 'unread' ? 'Chưa đọc' : 'Đã đọc'}
                        </span>
                      </div>
                    </div>

                    <div className="font-semibold text-gray-800">{msg.subject}</div>
                    <p className="text-gray-600 leading-relaxed bg-gray-50 p-3 rounded border border-gray-100">
                      {msg.message}
                    </p>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      {msg.status === 'unread' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateMessageStatus(msg.id, 'read')}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition cursor-pointer text-xs"
                        >
                          Đánh dấu đã đọc
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateMessageStatus(msg.id, 'unread')}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded font-medium transition cursor-pointer text-xs"
                        >
                          Đánh dấu chưa đọc
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
