import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminStoreAsync,
  saveAdminStoreAsync,
  approvePrivacyRequestAsync,
  rejectPrivacyRequestAsync,
  restoreCompanyPhoneAsync,
  toggleHiddenPhoneAsync,
  updateContactStatusAsync,
} from '@/lib/privacyStore';
import { clearProfileCache } from '@/lib/taxEngine';
import { clearAiScanCache } from '@/lib/companyAiScanner';

export async function GET() {
  try {
    const store = await getAdminStoreAsync();
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
      const ok = await approvePrivacyRequestAsync(body.requestId);
      if (body.taxId) {
        clearProfileCache(body.taxId);
        clearAiScanCache(body.taxId);
      }
      return NextResponse.json({ success: ok });
    }

    if (action === 'reject') {
      const ok = await rejectPrivacyRequestAsync(body.requestId);
      return NextResponse.json({ success: ok });
    }

    if (action === 'restore_phone') {
      const res = await restoreCompanyPhoneAsync(body.taxId, body.requestId);
      clearProfileCache(body.taxId);
      clearAiScanCache(body.taxId);
      return NextResponse.json({ success: res.success, phone: res.phone });
    }

    if (action === 'toggle_phone') {
      const ok = await toggleHiddenPhoneAsync(body.taxId, body.phone || '', body.reason);
      clearProfileCache(body.taxId);
      clearAiScanCache(body.taxId);
      return NextResponse.json({ success: ok });
    }

    if (action === 'update_message_status') {
      const ok = await updateContactStatusAsync(body.msgId, body.status);
      return NextResponse.json({ success: ok });
    }

    if (action === 'update_settings') {
      const store = await getAdminStoreAsync();
      store.settings = {
        ...store.settings,
        ...body.settings,
      };
      const ok = await saveAdminStoreAsync(store);
      return NextResponse.json({ success: ok, settings: store.settings });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err) {
    console.error('Lỗi khi xử lý thao tác admin:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
