import { NextRequest, NextResponse } from 'next/server';
import { getRecentLookupsAsync, recordRecentLookupAsync } from '@/lib/recentLookups';

export async function GET() {
  const list = await getRecentLookupsAsync();
  return NextResponse.json({
    success: true,
    data: list
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body && body.company && body.company.id && body.company.name) {
      const updated = await recordRecentLookupAsync(body.company);
      return NextResponse.json({
        success: true,
        data: updated
      });
    }
    return NextResponse.json({ success: false, message: 'Dữ liệu không hợp lệ' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Lỗi xử lý yêu cầu' }, { status: 500 });
  }
}
