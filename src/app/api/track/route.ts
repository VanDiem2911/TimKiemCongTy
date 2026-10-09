import { NextRequest, NextResponse, after } from 'next/server';
import { describePath, getClientIp, logActivity } from '@/lib/activityLog';

// Giới hạn số lượt ghi mỗi IP để tránh bị lạm dụng làm đầy nhật ký
const HITS = new Map<string, number[]>();
const MAX_PER_MINUTE = 40;

function allowed(ip: string): boolean {
  const now = Date.now();
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= MAX_PER_MINUTE) return false;
  recent.push(now);
  HITS.set(ip, recent);
  if (HITS.size > 5000) HITS.clear();
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = typeof body.path === 'string' ? body.path : '';
    if (!path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/api')) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const ip = getClientIp(request.headers);
    if (!allowed(ip)) return NextResponse.json({ success: true });

    const info = describePath(path);
    after(() =>
      logActivity({ feature: info.feature, action: 'view', summary: info.summary, target: info.target, path }, request.headers)
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
