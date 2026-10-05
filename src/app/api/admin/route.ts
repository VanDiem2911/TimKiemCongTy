import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminStore,
  saveAdminStore,
  approvePrivacyRequest,
  rejectPrivacyRequest,
  restoreCompanyPhone,
  toggleHiddenPhone,
  updateContactStatus,
} from '@/lib/privacyStore';
import { clearProfileCache } from '@/lib/taxEngine';
import { clearAiScanCache } from '@/lib/companyAiScanner';

export async function GET() {
  try {
    const store = getAdminStore();
    return NextResponse.json({ success: true, data: store });
  } catch (err) {
    console.error('Lỗi khi lấy dữ liệu admin:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      const ok = approvePrivacyRequest(body.requestId);
      if (body.taxId) {
        clearProfileCache(body.taxId);
        clearAiScanCache(body.taxId);
      }
      return NextResponse.json({ success: ok });
    }

    if (action === 'reject') {
      const ok = rejectPrivacyRequest(body.requestId);
      return NextResponse.json({ success: ok });
    }

    if (action === 'restore_phone') {
      const res = restoreCompanyPhone(body.taxId, body.requestId);
      clearProfileCache(body.taxId);
      clearAiScanCache(body.taxId);
      return NextResponse.json({ success: res.success, phone: res.phone });
    }

    if (action === 'toggle_phone') {
      const ok = toggleHiddenPhone(body.taxId, body.phone || '', body.reason);
      clearProfileCache(body.taxId);
      clearAiScanCache(body.taxId);
      return NextResponse.json({ success: ok });
    }

    if (action === 'update_message_status') {
      const ok = updateContactStatus(body.msgId, body.status);
      return NextResponse.json({ success: ok });
    }

    if (action === 'update_settings') {
      const store = getAdminStore();
      store.settings = {
        ...store.settings,
        ...body.settings,
      };
      const ok = saveAdminStore(store);
      return NextResponse.json({ success: ok, settings: store.settings });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err) {
    console.error('Lỗi khi xử lý thao tác admin:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
