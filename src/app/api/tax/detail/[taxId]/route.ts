import { NextRequest, NextResponse } from 'next/server';
import { getCompleteCompanyProfile } from '@/lib/taxEngine';
import { recordRecentLookup } from '@/lib/recentLookups';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taxId: string }> }
) {
  const { taxId: rawParam } = await params;
  if (!rawParam) {
    return NextResponse.json({
      success: false,
      message: 'Thiếu mã số thuế hoặc đường dẫn tra cứu',
      data: null
    }, { status: 400 });
  }

  const isRefresh = request.nextUrl.searchParams.get('refresh') === 'true' || request.nextUrl.searchParams.get('force') === 'true';
  const profile = await getCompleteCompanyProfile(rawParam, isRefresh);

  if (profile) {
    recordRecentLookup(profile);
    return NextResponse.json({
      success: true,
      source: 'verified-enterprise-profile',
      disclaimer: 'Dữ liệu xác thực đồng bộ trực tiếp từ Tổng cục Thuế',
      data: profile
    });
  }

  return NextResponse.json({
    success: false,
    message: 'Không tìm thấy thông tin mã số thuế',
    data: null
  }, { status: 404 });
}
