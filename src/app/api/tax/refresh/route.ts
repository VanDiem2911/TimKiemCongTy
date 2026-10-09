import { NextRequest, NextResponse, after } from 'next/server';
import { logActivity } from '@/lib/activityLog';
import { getCompleteCompanyProfile } from '@/lib/taxEngine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const target = body.slug || body.taxId || '';

    if (!target) {
      return NextResponse.json({
        success: false,
        message: 'Vui lòng cung cấp mã số thuế hoặc đường dẫn doanh nghiệp'
      }, { status: 400 });
    }

    const refreshed = await getCompleteCompanyProfile(target, true);
    after(() => logActivity({ channel: 'api', feature: 'Hồ sơ công ty', action: 'refresh', summary: `Cập nhật hồ sơ ${refreshed?.id ?? target}${refreshed?.name ? ' · ' + refreshed.name : ''}`, target: String(target) }, request.headers));

    if (!refreshed) {
      return NextResponse.json({
        success: false,
        message: 'Không tìm thấy hoặc không thể cập nhật dữ liệu mã số thuế'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật dữ liệu từ Tổng cục Thuế thành công',
      lastUpdated: refreshed.lastUpdated,
      data: refreshed
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống khi cập nhật';
    return NextResponse.json({
      success: false,
      message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('taxId') || searchParams.get('slug') || searchParams.get('q') || '';

  if (!target) {
    return NextResponse.json({
      success: false,
      message: 'Vui lòng cung cấp mã số thuế'
    }, { status: 400 });
  }

  const refreshed = await getCompleteCompanyProfile(target, true);

  if (!refreshed) {
    return NextResponse.json({
      success: false,
      message: 'Không tìm thấy dữ liệu'
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: 'Cập nhật dữ liệu từ Tổng cục Thuế thành công',
    lastUpdated: refreshed.lastUpdated,
    data: refreshed
  });
}
