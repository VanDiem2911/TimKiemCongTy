'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  MapPin,
  Monitor,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

interface LogItem {
  createdAt: string;
  ip: string;
  location: { label: string; isp?: string };
  userAgent: string;
  device: string;
  channel: 'web' | 'api';
  feature: string;
  action: 'view' | 'search' | 'refresh' | 'create';
  summary: string;
  target?: string;
  path?: string;
}

interface Actor {
  ip: string;
  label: string;
  count: number;
}

interface LogGroup {
  key: string;
  items: LogItem[]; // mới nhất trước
}

interface Filters {
  channel: string;
  feature: string;
  action: string;
  ip: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = { channel: '', feature: '', action: '', ip: '', from: '', to: '' };
const PAGE_SIZE = 100;
const GROUP_WINDOW_MS = 10 * 60 * 1000;
const TZ = 'Asia/Ho_Chi_Minh';

const ACTIONS: Record<LogItem['action'], { label: string; className: string }> = {
  view: { label: 'Xem', className: 'bg-slate-100 text-slate-700' },
  search: { label: 'Tra cứu', className: 'bg-sky-50 text-sky-700' },
  refresh: { label: 'Cập nhật', className: 'bg-blue-50 text-blue-700' },
  create: { label: 'Tạo mới', className: 'bg-emerald-50 text-emerald-700' },
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
const fmtSeconds = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: TZ });
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });

/** Gộp các thao tác liên tiếp giống nhau (cùng IP, chức năng, hành động) trong 10 phút. */
function groupItems(items: LogItem[]): LogGroup[] {
  const groups: LogGroup[] = [];
  for (const it of items) {
    const last = groups[groups.length - 1];
    const prev = last?.items[last.items.length - 1];
    if (
      last &&
      prev &&
      prev.ip === it.ip &&
      prev.feature === it.feature &&
      prev.action === it.action &&
      fmtDay(prev.createdAt) === fmtDay(it.createdAt) &&
      new Date(prev.createdAt).getTime() - new Date(it.createdAt).getTime() <= GROUP_WINDOW_MS
    ) {
      last.items.push(it);
    } else {
      groups.push({ key: `${it.ip}-${it.createdAt}`, items: [it] });
    }
  }
  return groups;
}

function ActionChip({ action }: { action: LogItem['action'] }) {
  const a = ACTIONS[action] ?? ACTIONS.view;
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${a.className}`}>{a.label}</span>;
}

export default function ActivityLogPanel() {
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [features, setFeatures] = useState<string[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<LogGroup | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      for (const [k, v] of Object.entries(applied)) if (v) params.set(k, v);
      if (appliedSearch) params.set('q', appliedSearch);
      const res = await fetch(`/api/admin/logs?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Không tải được nhật ký');
      setItems(json.items);
      setTotal(json.total);
      setFeatures(json.facets.features);
      setActors(json.facets.actors);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được nhật ký');
    } finally {
      setLoading(false);
    }
  }, [applied, appliedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const days = new Map<string, LogGroup[]>();
    for (const g of groupItems(items)) {
      const day = fmtDay(g.items[0].createdAt);
      const list = days.get(day) ?? [];
      list.push(g);
      days.set(day, list);
    }
    return [...days.entries()];
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const applyFilters = () => {
    setPage(1);
    setApplied(draft);
  };
  const toggleDay = (day: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });

  const selectClass =
    'w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300';
  const labelClass = 'block text-[11px] font-bold tracking-wide text-gray-500 uppercase mb-1.5';

  return (
    <div className="space-y-5">
      {/* Bộ lọc */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Kênh</label>
            <select className={selectClass} value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })}>
              <option value="">Tất cả kênh</option>
              <option value="web">Trang web</option>
              <option value="api">Tra cứu / API</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Chức năng</label>
            <select className={selectClass} value={draft.feature} onChange={(e) => setDraft({ ...draft, feature: e.target.value })}>
              <option value="">Tất cả chức năng</option>
              {features.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Hành động</label>
            <select className={selectClass} value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })}>
              <option value="">Tất cả hành động</option>
              {Object.entries(ACTIONS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Người thao tác</label>
            <select className={selectClass} value={draft.ip} onChange={(e) => setDraft({ ...draft, ip: e.target.value })}>
              <option value="">Tất cả người thao tác</option>
              {actors.map((a) => (
                <option key={a.ip} value={a.ip}>
                  {a.label} · {a.ip} ({a.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Từ ngày</label>
            <input type="date" className={selectClass} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Đến ngày</label>
            <input type="date" className={selectClass} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex items-end justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY_FILTERS);
                setApplied(EMPTY_FILTERS);
                setSearch('');
                setAppliedSearch('');
                setPage(1);
              }}
              className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Xóa lọc
            </button>
            <button
              type="button"
              onClick={load}
              title="Tải lại"
              className="h-11 w-11 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="h-11 px-6 rounded-full bg-[#e91a2c] hover:bg-[#c51322] text-white text-sm font-bold shadow-sm cursor-pointer"
            >
              Áp dụng bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách nhật ký */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">Danh sách nhật ký</h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">{total.toLocaleString('vi-VN')} bản ghi</span>
          </div>
          <form
            className="relative w-full sm:w-80"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setAppliedSearch(search.trim());
            }}
          >
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm IP, vị trí, nội dung..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
            />
          </form>
        </div>

        {error && <div className="mx-5 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{error}</div>}

        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[90px_1.4fr_150px_2fr_110px_70px] gap-3 bg-[#c51322] text-white text-[11px] font-bold tracking-wider uppercase px-5 py-3.5">
              <div>Giờ</div>
              <div>Người thao tác</div>
              <div>Chức năng</div>
              <div>Tóm tắt</div>
              <div>Hành động</div>
              <div className="text-right">Chi tiết</div>
            </div>

            {byDay.length === 0 && !loading && (
              <div className="py-16 text-center text-sm text-gray-500">
                Chưa có nhật ký nào. Nhật ký được ghi khi có người truy cập trang web (bot và công cụ tự động được bỏ qua).
              </div>
            )}

            {byDay.map(([day, groups]) => {
              const isCollapsed = collapsed.has(day);
              const count = groups.reduce((n, g) => n + g.items.length, 0);
              return (
                <div key={day}>
                  <button
                    type="button"
                    onClick={() => toggleDay(day)}
                    className="w-full flex items-center gap-2.5 px-5 py-3 bg-gray-50 border-b border-gray-100 text-left cursor-pointer"
                  >
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    <Calendar className="w-4 h-4 text-[#e91a2c]" />
                    <span className="font-bold text-sm text-gray-900">{day}</span>
                    <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{count} bản ghi</span>
                  </button>

                  {!isCollapsed &&
                    groups.map((g) => {
                      const head = g.items[0];
                      return (
                        <button
                          type="button"
                          key={g.key}
                          onClick={() => setSelected(g)}
                          className="w-full grid grid-cols-[90px_1.4fr_150px_2fr_110px_70px] gap-3 items-center px-5 py-4 border-b border-gray-100 text-left hover:bg-red-50/40 transition cursor-pointer"
                        >
                          <div className="font-bold text-sm text-gray-900">{fmtTime(head.createdAt)}</div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{head.location.label}</div>
                            <div className="text-xs text-gray-400 truncate">
                              {head.ip}
                              {head.location.isp ? ` · ${head.location.isp}` : ''}
                            </div>
                          </div>
                          <div>
                            <span className="inline-block px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{head.feature}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900 truncate">{head.summary}</div>
                            {g.items.length > 1 && <div className="text-xs text-blue-600 font-medium">Gộp {g.items.length} lần thao tác</div>}
                            <div className="text-xs text-gray-400 truncate">{head.device}</div>
                          </div>
                          <div>
                            <ActionChip action={head.action} />
                          </div>
                          <div className="flex justify-end">
                            <ChevronRight className="w-4 h-4 text-red-400" />
                          </div>
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 text-sm text-gray-600">
            <span>
              Trang {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-9 px-3 rounded-lg border border-gray-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 px-3 rounded-lg border border-gray-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                Sau <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ngăn chi tiết bên phải */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" aria-label="Đóng" onClick={() => setSelected(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default" />
          <aside className="relative w-full max-w-md h-full bg-[#f5f1ee] shadow-2xl flex flex-col">
            <div className="bg-gradient-to-br from-[#c51322] to-[#e91a2c] text-white px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold tracking-wide uppercase opacity-80">{selected.items[0].feature}</div>
                  <h4 className="text-lg font-bold leading-snug mt-1 break-words">{selected.items[0].summary}</h4>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="p-1 rounded-full hover:bg-white/20 cursor-pointer" aria-label="Đóng">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs">
                <ActionChip action={selected.items[0].action} />
                <span className="opacity-90 truncate">{selected.items[0].channel === 'api' ? 'Tra cứu / API' : 'Trang web'}</span>
              </div>
            </div>

            <div className="bg-white px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#e91a2c] text-white flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 truncate">{selected.items[0].location.label}</div>
                  <div className="text-xs text-gray-500 truncate">IP {selected.items[0].ip}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                {selected.items[0].location.isp && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Nhà mạng: {selected.items[0].location.isp}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" /> {selected.items[0].device}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {fmtDay(selected.items[0].createdAt)} {fmtSeconds(selected.items[selected.items.length - 1].createdAt)}
                  {selected.items.length > 1 && <> → {fmtSeconds(selected.items[0].createdAt)}</>}
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-400">Vị trí suy ra từ địa chỉ IP nên chỉ chính xác ở mức tỉnh/thành phố, không xác định được số nhà hay tên đường.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="text-xs font-semibold text-red-600">
                {selected.items.length} lần thao tác <span className="text-gray-400 font-normal">· mới nhất ở trên</span>
              </div>
              {selected.items.map((it, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <ActionChip action={it.action} />
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{fmtSeconds(it.createdAt)}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-900 break-words">{it.summary}</div>
                  {it.path && <div className="mt-1 text-xs text-gray-400 break-all">{it.path}</div>}
                  {it.target && !it.path && <div className="mt-1 text-xs text-gray-400 break-all">Đối tượng: {it.target}</div>}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
