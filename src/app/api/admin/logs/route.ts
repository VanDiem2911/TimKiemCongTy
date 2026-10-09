import { NextRequest, NextResponse } from 'next/server';
import type { Filter } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import type { ActivityLog } from '@/lib/activityLog';

// /api/admin/* đã được middleware chặn khi chưa đăng nhập quản trị.

const COLLECTION = 'activity_logs';

function parseDay(value: string | null, endOfDay: boolean): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  // Ngày người dùng chọn tính theo giờ Việt Nam (UTC+7)
  const d = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Chưa kết nối được MongoDB' }, { status: 503 });
    }
    const coll = db.collection<ActivityLog>(COLLECTION);
    const sp = request.nextUrl.searchParams;

    const filter: Filter<ActivityLog> = {};
    const channel = sp.get('channel');
    const feature = sp.get('feature');
    const action = sp.get('action');
    const ip = sp.get('ip');
    const q = sp.get('q')?.trim();
    if (channel === 'web' || channel === 'api') filter.channel = channel;
    if (feature) filter.feature = feature;
    if (action) filter.action = action as ActivityLog['action'];
    if (ip) filter.ip = ip;

    const from = parseDay(sp.get('from'), false);
    const to = parseDay(sp.get('to'), true);
    if (from || to) filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ ip: rx }, { 'location.label': rx }, { summary: rx }, { target: rx }, { device: rx }];
    }

    const limit = Math.min(500, Math.max(1, parseInt(sp.get('limit') || '200', 10)));
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));

    const [items, total, features, actors] = await Promise.all([
      coll
        .find(filter, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      coll.countDocuments(filter),
      coll.distinct('feature'),
      coll
        .aggregate<{ _id: string; label: string; count: number }>([
          { $sort: { createdAt: -1 } },
          { $group: { _id: '$ip', label: { $first: '$location.label' }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 100 },
        ])
        .toArray(),
    ]);

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      items,
      facets: {
        features: features.sort(),
        actors: actors.map((a) => ({ ip: a._id, label: a.label, count: a.count })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
