import { NextResponse } from 'next/server';
import { getVisitStats } from '@/lib/visitStats';

// /api/admin/* đã được middleware chặn khi chưa đăng nhập quản trị.

export async function GET() {
  try {
    const stats = await getVisitStats();
    if (!stats) {
      return NextResponse.json({ success: false, message: 'Chưa kết nối được MongoDB' }, { status: 503 });
    }
    return NextResponse.json({ success: true, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
