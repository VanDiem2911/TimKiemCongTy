import { NextRequest, NextResponse } from 'next/server';

// Tài khoản quản trị. Đặt ADMIN_USERNAME / ADMIN_PASSWORD trong biến môi
// trường để đổi, nếu không sẽ dùng tài khoản mặc định như trước.
// Khi đã đặt biến môi trường thì CHỈ chấp nhận giá trị đó. Nếu vẫn kèm theo
// tài khoản mặc định thì đổi mật khẩu cũng vô nghĩa, vì admin/admin123 viết
// trong mã nguồn công khai vẫn đăng nhập được.
export const ADMIN_CREDENTIALS = {
  usernames: process.env.ADMIN_USERNAME
    ? [process.env.ADMIN_USERNAME.trim().toLowerCase()]
    : ['admin', 'admin@timkiemcongty.com'],
  passwords: process.env.ADMIN_PASSWORD
    ? [process.env.ADMIN_PASSWORD]
    : ['admin', 'admin123'],
};

export const AUTH_COOKIE_NAME = 'admin_session_token';
export const AUTH_TOKEN_SECRET =
  process.env.ADMIN_SESSION_SECRET || 'admin_secure_session_2026_masothue';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (token === AUTH_TOKEN_SECRET) {
      return NextResponse.json({
        authenticated: true,
        user: { username: 'admin', role: 'Quản Trị Viên Hệ Thống' },
      });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (err) {
    console.error('Lỗi khi kiểm tra đăng nhập:', err);
    return NextResponse.json({ authenticated: false, error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const { action, username, password } = body as { action?: string; username?: string; password?: string };

    if (action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Đã đăng xuất' });
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }

    if (action === 'login' || !action) {
      const cleanUser = (username || '').trim().toLowerCase();
      const cleanPass = (password || '').trim();

      const isUserValid = ADMIN_CREDENTIALS.usernames.includes(cleanUser);
      const isPassValid = ADMIN_CREDENTIALS.passwords.includes(cleanPass);

      if (isUserValid && isPassValid) {
        const response = NextResponse.json({
          success: true,
          message: 'Đăng nhập thành công',
          user: { username: 'admin', role: 'Quản Trị Viên Hệ Thống' },
        });

        // Set session cookie for 7 days
        response.cookies.set({
          name: AUTH_COOKIE_NAME,
          value: AUTH_TOKEN_SECRET,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        });

        return response;
      }

      return NextResponse.json(
        { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err) {
    console.error('Lỗi khi xử lý đăng nhập:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ xử lý đăng nhập' }, { status: 500 });
  }
}
