import { NextRequest, NextResponse, after } from 'next/server';
import { logActivity } from '@/lib/activityLog';
import { submitPrivacyRequestAsync, isPhoneHidden } from '@/lib/privacyStore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taxId = searchParams.get('taxId');
  if (!taxId) {
    return NextResponse.json({ error: 'Missing taxId' }, { status: 400 });
  }

  const hidden = isPhoneHidden(taxId);
  return NextResponse.json({ taxId, isHidden: hidden });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taxId, companyName, phone, requesterName, requesterPhone, requesterEmail, reason, identityProof } = body;

    if (!taxId || !requesterName || !requesterPhone || !reason) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ thông tin: Mã số thuế, Họ tên, Số điện thoại liên hệ và Lý do.' },
        { status: 400 }
      );
    }

    after(() => logActivity({ channel: 'api', feature: 'Quyền riêng tư', action: 'create', summary: `Gửi yêu cầu ẩn số điện thoại: ${String(companyName || 'Doanh nghiệp').trim()} (${String(taxId).trim()})`, target: String(taxId).trim() }, request.headers));

    const result = await submitPrivacyRequestAsync({
      taxId: String(taxId).trim(),
      companyName: String(companyName || 'Doanh nghiệp').trim(),
      phone: String(phone || '').trim(),
      requesterName: String(requesterName).trim(),
      requesterPhone: String(requesterPhone).trim(),
      requesterEmail: String(requesterEmail || '').trim(),
      reason: String(reason).trim(),
      identityProof: identityProof ? String(identityProof).trim() : '',
    });

    return NextResponse.json({
      success: true,
      message: 'Yêu cầu ẩn số điện thoại đã được ghi nhận. Ban quản trị sẽ đối soát và phê duyệt sớm nhất.',
      data: result.request,
    });
  } catch (err) {
    console.error('Lỗi khi gửi yêu cầu ẩn số điện thoại:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ khi xử lý yêu cầu' }, { status: 500 });
  }
}
