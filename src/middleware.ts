import { NextRequest, NextResponse } from 'next/server';

/**
 * Chặn mọi API quản trị khi chưa đăng nhập.
 *
 * Trước đây các route /api/admin/* không hề kiểm tra gì: ai biết đường dẫn đều
 * đọc được danh sách tin nhắn liên hệ, yêu cầu ẩn số điện thoại kèm họ tên,
 * email, số điện thoại của người gửi, và gọi được cả lệnh duyệt / ẩn / cào dữ
 * liệu. Màn hình đăng nhập chỉ nằm ở phía trình duyệt nên không bảo vệ được gì.
 *
 * Riêng /api/admin/auth vẫn mở để còn đăng nhập được.
 */
const AUTH_COOKIE_NAME = 'admin_session_token';
const AUTH_TOKEN_SECRET =
  process.env.ADMIN_SESSION_SECRET || 'admin_secure_session_2026_masothue';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/admin/auth')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token === AUTH_TOKEN_SECRET) {
    return NextResponse.next();
  }

  return NextResponse.json(
    { success: false, message: 'Bạn cần đăng nhập quản trị để dùng chức năng này.' },
    { status: 401 }
  );
}

export const config = {
  matcher: ['/api/admin/:path*'],
};
