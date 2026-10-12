import { getDb } from '@/lib/mongodb';
import type { ActivityLog } from '@/lib/activityLog';

/**
 * Thống kê lượt truy cập thực tế, tính từ các bản ghi `action: 'view'` trong `activity_logs`
 * (mỗi lượt mở trang do PageViewTracker gửi lên, đã loại bot và trang /admin).
 *
 * - "Lượt xem" = số lần mở trang.
 * - "Người truy cập" = số địa chỉ IP khác nhau (cách đếm thông dụng khi không dùng cookie định danh;
 *   nhiều người chung một mạng sẽ tính là một, một người đổi mạng sẽ tính là hai).
 *
 * Ngày được chia theo giờ Việt Nam (UTC+7) để khớp với cách người quản trị đọc báo cáo.
 */

const COLLECTION = 'activity_logs';
const DAY_MS = 86_400_000;
const VN_OFFSET_MS = 7 * 3_600_000;
const ONLINE_WINDOW_MS = 5 * 60_000;
/** Chuỗi ngày trả về cho biểu đồ: 30 ngày hiện tại + 30 ngày trước đó để so sánh. */
export const SERIES_DAYS = 60;

export interface VisitCounts {
  views: number;
  visitors: number;
}

export interface VisitDay extends VisitCounts {
  /** Ngày theo giờ Việt Nam, dạng YYYY-MM-DD */
  date: string;
}

export interface VisitFeature extends VisitCounts {
  feature: string;
}

export interface VisitStats {
  generatedAt: string;
  /** Số người (IP) có lượt xem trong 5 phút gần nhất */
  online: number;
  today: VisitCounts;
  last7: VisitCounts;
  prev7: VisitCounts;
  last30: VisitCounts;
  prev30: VisitCounts;
  /** SERIES_DAYS ngày liên tiếp, cũ nhất trước, ngày cuối là hôm nay; ngày không có lượt nào vẫn có mặt với 0 */
  series: VisitDay[];
  /** Chức năng được xem nhiều nhất trong 30 ngày qua */
  topFeatures: VisitFeature[];
}

const startOfVnDay = (ms: number) => Math.floor((ms + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;
const vnDateKey = (ms: number) => new Date(ms + VN_OFFSET_MS).toISOString().slice(0, 10);

type WindowKey = 'today' | 'last7' | 'prev7' | 'last30' | 'prev30';

export async function getVisitStats(): Promise<VisitStats | null> {
  const db = await getDb();
  if (!db) return null;
  const coll = db.collection<ActivityLog>(COLLECTION);

  const now = Date.now();
  const todayStart = startOfVnDay(now);
  const seriesStart = todayStart - (SERIES_DAYS - 1) * DAY_MS;

  // [từ, đến) của từng khoảng; các khoảng "trước" nằm liền sát khoảng hiện tại
  const windows: Record<WindowKey, [number, number]> = {
    today: [todayStart, now + DAY_MS],
    last7: [todayStart - 6 * DAY_MS, now + DAY_MS],
    prev7: [todayStart - 13 * DAY_MS, todayStart - 6 * DAY_MS],
    last30: [todayStart - 29 * DAY_MS, now + DAY_MS],
    prev30: [todayStart - 59 * DAY_MS, todayStart - 29 * DAY_MS],
  };
  const keys = Object.keys(windows) as WindowKey[];

  const match = { action: 'view' as const, createdAt: { $gte: new Date(seriesStart) } };

  // Một lượt quét: gom theo IP đếm số lượt trong từng khoảng, rồi cộng lại để ra lượt xem và số IP khác nhau
  const perIp: Record<string, unknown> = {};
  const totals: Record<string, unknown> = { _id: null };
  for (const k of keys) {
    const [from, to] = windows[k];
    perIp[k] = {
      $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', new Date(from)] }, { $lt: ['$createdAt', new Date(to)] }] }, 1, 0] },
    };
    totals[`${k}Views`] = { $sum: `$${k}` };
    totals[`${k}Visitors`] = { $sum: { $cond: [{ $gt: [`$${k}`, 0] }, 1, 0] } };
  }

  const [totalRows, dailyRows, featureRows, onlineIps] = await Promise.all([
    coll
      .aggregate<Record<string, number>>([{ $match: match }, { $group: { _id: '$ip', ...perIp } }, { $group: totals }])
      .toArray(),
    coll
      .aggregate<{ _id: string; views: number; visitors: number }>([
        { $match: match },
        {
          $group: {
            _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' } }, ip: '$ip' },
            views: { $sum: 1 },
          },
        },
        { $group: { _id: '$_id.day', views: { $sum: '$views' }, visitors: { $sum: 1 } } },
      ])
      .toArray(),
    coll
      .aggregate<{ _id: string; views: number; visitors: number }>([
        { $match: { action: 'view', createdAt: { $gte: new Date(windows.last30[0]) } } },
        { $group: { _id: { feature: '$feature', ip: '$ip' }, views: { $sum: 1 } } },
        { $group: { _id: '$_id.feature', views: { $sum: '$views' }, visitors: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 8 },
      ])
      .toArray(),
    coll.distinct('ip', { action: 'view', createdAt: { $gte: new Date(now - ONLINE_WINDOW_MS) } }),
  ]);

  const t = totalRows[0] ?? {};
  const counts = (k: WindowKey): VisitCounts => ({ views: t[`${k}Views`] ?? 0, visitors: t[`${k}Visitors`] ?? 0 });

  const byDay = new Map(dailyRows.map((r) => [r._id, r]));
  const series: VisitDay[] = [];
  for (let i = 0; i < SERIES_DAYS; i++) {
    const date = vnDateKey(seriesStart + i * DAY_MS);
    const row = byDay.get(date);
    series.push({ date, views: row?.views ?? 0, visitors: row?.visitors ?? 0 });
  }

  return {
    generatedAt: new Date(now).toISOString(),
    online: onlineIps.length,
    today: counts('today'),
    last7: counts('last7'),
    prev7: counts('prev7'),
    last30: counts('last30'),
    prev30: counts('prev30'),
    series,
    topFeatures: featureRows.map((r) => ({ feature: r._id, views: r.views, visitors: r.visitors })),
  };
}
