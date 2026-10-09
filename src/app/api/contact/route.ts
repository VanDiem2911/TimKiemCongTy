import { NextRequest, NextResponse, after } from 'next/server';
import { logActivity } from '@/lib/activityLog';
import { submitContactAsync } from '@/lib/privacyStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, taxId, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Vui lòng điền họ tên, email và nội dung liên hệ.' },
        { status: 400 }
      );
    }

    const subject = taxId ? `Liên hệ về MST ${taxId}` : 'Góp ý / Yêu cầu hỗ trợ';

    after(() => logActivity({ channel: 'web', feature: 'Liên hệ', action: 'create', summary: `Gửi tin nhắn liên hệ: ${subject}`, target: taxId ? String(taxId) : undefined }, request.headers));

    const result = await submitContactAsync({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : undefined,
      subject,
      message: String(message).trim(),
    });

    return NextResponse.json({
      success: true,
      message: 'Tin nhắn đã được gửi thành công.',
      data: result.message,
    });
  } catch (err) {
    console.error('Lỗi khi gửi liên hệ:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ khi xử lý liên hệ' }, { status: 500 });
  }
}
