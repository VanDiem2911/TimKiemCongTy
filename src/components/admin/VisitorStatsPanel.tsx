'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Minus, Radio, RefreshCw, TrendingDown, TrendingUp, Users } from 'lucide-react';
import type { VisitCounts, VisitStats } from '@/lib/visitStats';

type Range = 7 | 30;
type Metric = 'visitors' | 'views';

const REFRESH_MS = 60_000;
const CHART_HEIGHT = 280;
const MARGIN = { top: 12, right: 16, bottom: 28, left: 44 };

// Bảng màu chuẩn: slot 1 (xanh) = kỳ này, slot 2 (cam) = kỳ trước; chữ luôn dùng màu mực, không dùng màu dữ liệu
const COLOR_CURRENT = '#2a78d6';
const COLOR_PREVIOUS = '#eb6834';
const COLOR_GRID = '#e1e0d9';
const COLOR_AXIS = '#c3c2b7';
const COLOR_MUTED = '#898781';
const COLOR_SURFACE = '#ffffff';

const METRIC_LABEL: Record<Metric, string> = { visitors: 'Người truy cập', views: 'Lượt xem' };

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** Phần trăm thay đổi so với kỳ trước; null khi kỳ trước không có dữ liệu để so sánh. */
function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Làm tròn trần trục Y lên số "đẹp" (1, 2, 5 × 10^n) và chia thành 4 khoảng đều nhau. */
function niceScale(max: number): { top: number; ticks: number[] } {
  const rough = Math.max(max, 4) / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / pow;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * pow;
  return { top: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function Delta({ current, previous, label }: { current: number; previous: number; label: string }) {
  const pct = pctChange(current, previous);
  if (pct === null) {
    return (
      <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
        <Minus className="w-3 h-3" aria-hidden />
        Chưa có dữ liệu {label}
      </div>
    );
  }
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <div className="text-[11px] mt-2 flex items-center gap-1">
      <span className={`inline-flex items-center gap-1 font-semibold ${up ? 'text-[#006300]' : 'text-rose-600'}`}>
        <Icon className="w-3 h-3" aria-hidden />
        {up ? '+' : ''}
        {pct.toLocaleString('vi-VN')}%
      </span>
      <span className="text-slate-500">so với {label}</span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  tint,
  label,
  value,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  label: string;
  value: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${tint}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 leading-tight">{label}</span>
      </div>
      <div className="text-3xl font-black text-slate-900">{fmt(value)}</div>
      {children}
    </div>
  );
}

interface ChartPoint {
  date: string;
  value: number;
  prevDate: string;
  prevValue: number;
}

function VisitChart({ points, metric }: { points: ChartPoint[]; metric: Metric }) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const n = points.length;
  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const innerH = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const max = Math.max(0, ...points.map((p) => Math.max(p.value, p.prevValue)));
  const { top, ticks } = niceScale(max);

  const x = (i: number) => MARGIN.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => MARGIN.top + innerH - (v / top) * innerH;

  const linePath = (pick: (p: ChartPoint) => number) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(pick(p)).toFixed(1)}`).join(' ');
  const currentPath = linePath((p) => p.value);
  const previousPath = linePath((p) => p.prevValue);
  const areaPath = n > 0 ? `${currentPath} L${x(n - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z` : '';

  // Nhãn trục X thưa ra để không đè nhau: tối đa ~7 nhãn, luôn có nhãn ngày cuối
  const labelEvery = Math.max(1, Math.ceil(n / 7));
  const labelIdx = points.map((_, i) => i).filter((i) => (n - 1 - i) % labelEvery === 0);

  const pickIndex = (clientX: number, rect: DOMRect) => {
    const rel = clientX - rect.left - MARGIN.left;
    const i = Math.round((rel / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const hovered = hover !== null ? points[hover] : null;
  const tipLeft = hover !== null ? x(hover) : 0;
  const tipOnRight = tipLeft < width / 2;

  return (
    <div
      ref={wrapRef}
      className="relative h-[280px] outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-sky-300"
      tabIndex={0}
      role="img"
      aria-label={`Biểu đồ ${METRIC_LABEL[metric].toLowerCase()} theo ngày, so với kỳ trước. Dùng phím mũi tên trái phải để xem từng ngày.`}
      onPointerMove={(e) => pickIndex(e.clientX, e.currentTarget.getBoundingClientRect())}
      onPointerLeave={() => setHover(null)}
      onFocus={() => setHover((h) => h ?? n - 1)}
      onBlur={() => setHover(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1));
        else if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
        else return;
        e.preventDefault();
      }}
    >
      {width > 0 && n > 0 && (
        <svg width={width} height={CHART_HEIGHT} className="block select-none" aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? COLOR_AXIS : COLOR_GRID} strokeWidth={1} />
              <text x={MARGIN.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={COLOR_MUTED}>
                {fmt(t)}
              </text>
            </g>
          ))}
          {labelIdx.map((i) => (
            <text key={points[i].date} x={x(i)} y={CHART_HEIGHT - 8} textAnchor="middle" fontSize={11} fill={COLOR_MUTED}>
              {fmtDayMonth(points[i].date)}
            </text>
          ))}

          <path d={areaPath} fill={COLOR_CURRENT} fillOpacity={0.1} />
          <path d={previousPath} fill="none" stroke={COLOR_PREVIOUS} strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
          <path d={currentPath} fill="none" stroke={COLOR_CURRENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={MARGIN.top} y2={MARGIN.top + innerH} stroke={COLOR_AXIS} strokeWidth={1} />
          )}
          {/* Điểm cuối (hôm nay) hoặc điểm đang trỏ: chấm ≥ 8px có viền 2px màu nền */}
          {(hover !== null ? [hover] : [n - 1]).map((i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(points[i].prevValue)} r={hover !== null ? 5 : 0} fill={COLOR_PREVIOUS} stroke={COLOR_SURFACE} strokeWidth={2} />
              <circle cx={x(i)} cy={y(points[i].value)} r={5} fill={COLOR_CURRENT} stroke={COLOR_SURFACE} strokeWidth={2} />
            </g>
          ))}
        </svg>
      )}

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 min-w-[11rem] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs"
          style={{ top: MARGIN.top, ...(tipOnRight ? { left: tipLeft + 12 } : { right: width - tipLeft + 12 }) }}
        >
          {[
            { key: 'cur', color: COLOR_CURRENT, dashed: false, date: hovered.date, value: hovered.value },
            { key: 'prev', color: COLOR_PREVIOUS, dashed: true, date: hovered.prevDate, value: hovered.prevValue },
          ].map((row) => (
            <div key={row.key} className="flex items-center gap-2 py-0.5">
              <svg width="16" height="4" aria-hidden>
                <line x1="0" x2="16" y1="2" y2="2" stroke={row.color} strokeWidth={2} strokeDasharray={row.dashed ? '4 3' : undefined} />
              </svg>
              <span className="font-bold text-slate-900 tabular-nums">{fmt(row.value)}</span>
              <span className="text-slate-500">{fmtDayMonth(row.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VisitorStatsPanel() {
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [range, setRange] = useState<Range>(30);
  const [metric, setMetric] = useState<Metric>('visitors');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/visits', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setStats(json.stats as VisitStats);
        setError('');
      } else {
        setError(json.message || 'Không tải được thống kê truy cập.');
      }
    } catch {
      setError('Không tải được thống kê truy cập.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const points = useMemo<ChartPoint[]>(() => {
    if (!stats) return [];
    const s = stats.series;
    const current = s.slice(-range);
    const previous = s.slice(-range * 2, -range);
    return current.map((d, i) => ({
      date: d.date,
      value: d[metric],
      prevDate: previous[i]?.date ?? d.date,
      prevValue: previous[i]?.[metric] ?? 0,
    }));
  }, [stats, range, metric]);

  const rangeCounts: VisitCounts | null = stats ? (range === 7 ? stats.last7 : stats.last30) : null;
  const noTraffic = stats !== null && stats.last30.views === 0 && stats.prev30.views === 0;

  return (
    <section className="space-y-5" aria-label="Thống kê truy cập website">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-1 h-6 rounded-full bg-[#2a78d6]" aria-hidden />
          <h2 className="text-base font-black uppercase tracking-wide text-slate-900">Thống kê truy cập</h2>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-lg transition cursor-pointer"
          title="Làm mới thống kê truy cập"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </div>

      {error && !stats && (
        <div className="p-3.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300">{error}</div>
      )}

      {/* Làm mới dữ liệu thì giữ nguyên khung, chỉ làm mờ nhẹ */}
      <div className={`space-y-5 transition-opacity ${loading && stats ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard icon={Radio} tint="bg-emerald-100 text-emerald-600" label="Đang truy cập" value={stats?.online ?? 0}>
            <div className="text-[11px] text-slate-500 mt-2">Người có lượt xem trong 5 phút qua</div>
          </StatCard>
          <StatCard icon={Users} tint="bg-sky-100 text-sky-600" label="Người truy cập hôm nay" value={stats?.today.visitors ?? 0}>
            <div className="text-[11px] text-slate-500 mt-2">{fmt(stats?.today.views ?? 0)} lượt xem trang</div>
          </StatCard>
          <StatCard icon={Users} tint="bg-sky-100 text-sky-600" label="Người truy cập 7 ngày" value={stats?.last7.visitors ?? 0}>
            <Delta current={stats?.last7.visitors ?? 0} previous={stats?.prev7.visitors ?? 0} label="7 ngày trước" />
          </StatCard>
          <StatCard icon={Eye} tint="bg-amber-100 text-amber-600" label="Lượt xem 30 ngày" value={stats?.last30.views ?? 0}>
            <Delta current={stats?.last30.views ?? 0} previous={stats?.prev30.views ?? 0} label="30 ngày trước" />
          </StatCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">
                  {METRIC_LABEL[metric]} theo ngày
                </h3>
                {rangeCounts && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {range} ngày qua: <strong className="text-slate-800">{fmt(rangeCounts[metric])}</strong>{' '}
                    {metric === 'visitors' ? 'người truy cập' : 'lượt xem'}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg" role="group" aria-label="Chỉ số">
                  {(['visitors', 'views'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMetric(m)}
                      aria-pressed={metric === m}
                      className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                        metric === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {METRIC_LABEL[m]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg" role="group" aria-label="Khoảng thời gian">
                  {([30, 7] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      aria-pressed={range === r}
                      className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                        range === r ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {r} ngày qua
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2">
                <svg width="16" height="4" aria-hidden>
                  <line x1="0" x2="16" y1="2" y2="2" stroke={COLOR_CURRENT} strokeWidth={2} />
                </svg>
                {range} ngày qua
              </span>
              <span className="inline-flex items-center gap-2">
                <svg width="16" height="4" aria-hidden>
                  <line x1="0" x2="16" y1="2" y2="2" stroke={COLOR_PREVIOUS} strokeWidth={2} strokeDasharray="4 3" />
                </svg>
                {range} ngày trước đó
              </span>
            </div>

            {stats ? (
              <>
                <VisitChart points={points} metric={metric} />
                {noTraffic && (
                  <p className="text-xs text-slate-500">
                    Chưa ghi nhận lượt truy cập nào. Số liệu sẽ xuất hiện khi có người mở các trang của website (không tính quản trị viên và bot).
                  </p>
                )}
                <details className="text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold text-slate-700 select-none">Xem dạng bảng</summary>
                  <div className="mt-2 max-h-64 overflow-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Ngày</th>
                          <th className="px-3 py-2 font-semibold text-right">{range} ngày qua</th>
                          <th className="px-3 py-2 font-semibold">Ngày kỳ trước</th>
                          <th className="px-3 py-2 font-semibold text-right">Kỳ trước</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...points].reverse().map((p) => (
                          <tr key={p.date}>
                            <td className="px-3 py-1.5">{fmtDayMonth(p.date)}</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-slate-900 tabular-nums">{fmt(p.value)}</td>
                            <td className="px-3 py-1.5">{fmtDayMonth(p.prevDate)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{fmt(p.prevValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            ) : (
              !error && <div className="h-[280px] flex items-center justify-center text-xs text-slate-400">Đang tải thống kê…</div>
            )}
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Trang được xem nhiều</h3>
              <span className="text-xs font-semibold text-slate-500">30 ngày qua</span>
            </div>
            {stats && stats.topFeatures.length > 0 ? (
              <ul className="divide-y divide-slate-100 text-xs">
                {stats.topFeatures.map((f) => {
                  const share = stats.last30.views > 0 ? (f.views / stats.last30.views) * 100 : 0;
                  return (
                    <li key={f.feature} className="py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-bold text-slate-900 truncate">{f.feature}</span>
                        <span className="shrink-0 font-semibold text-slate-900 tabular-nums">{fmt(f.views)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
                        <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: COLOR_CURRENT }} />
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {fmt(f.visitors)} người truy cập · {share.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% lượt xem
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">Chưa có dữ liệu.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
