import { NextRequest, NextResponse, after } from 'next/server';
import { logActivity } from '@/lib/activityLog';
import { scanCompanyContactAI } from '@/lib/companyAiScanner';
import { getCompleteCompanyProfile } from '@/lib/taxEngine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      taxId,
      companyName,
      shortName,
      internationalName,
      address,
      phone,
      force = false
    } = body;

    if (!taxId && !companyName) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin mã số thuế hoặc tên doanh nghiệp' },
        { status: 400 }
      );
    }

    after(() => logActivity({ channel: 'api', feature: 'Quét liên hệ AI', action: 'search', summary: `Quét thông tin liên hệ: ${companyName || taxId}`, target: String(taxId || companyName) }, request.headers));

    const finalId = taxId || '';
    let finalName = companyName || '';
    let finalShortName = shortName || '';
    let finalIntName = internationalName || '';
    let finalAddress = address || '';
    let finalPhone = phone || '';

    // Always fetch profile if shortName or name is missing to ensure brand tokens are complete
    if (finalId && (!finalShortName || !finalName)) {
      const profile = await getCompleteCompanyProfile(finalId);
      if (profile) {
        finalName = finalName || profile.name;
        finalShortName = finalShortName || profile.shortName || '';
        finalIntName = finalIntName || profile.internationalName || '';
        finalAddress = finalAddress || profile.address;
        finalPhone = finalPhone || profile.phone || '';
      }
    }

    const contactAI = await scanCompanyContactAI(
      {
        id: finalId,
        name: finalName,
        shortName: finalShortName,
        internationalName: finalIntName,
        address: finalAddress,
        phone: finalPhone
      },
      Boolean(force)
    );

    return NextResponse.json({
      success: true,
      data: contactAI
    });
  } catch (error) {
    console.error('Error in /api/tax/ai-scan:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi trong quá trình AI quét thông tin doanh nghiệp' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taxId = searchParams.get('taxId') || searchParams.get('id') || '';
    const force = searchParams.get('force') === 'true' || searchParams.get('refresh') === 'true';

    if (!taxId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu mã số thuế taxId' },
        { status: 400 }
      );
    }

    const profile = await getCompleteCompanyProfile(taxId);
    if (!profile) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hồ sơ doanh nghiệp' },
        { status: 404 }
      );
    }

    const contactAI = await scanCompanyContactAI(
      {
        id: profile.id,
        name: profile.name,
        shortName: profile.shortName,
        internationalName: profile.internationalName,
        address: profile.address,
        phone: profile.phone
      },
      force
    );

    return NextResponse.json({
      success: true,
      data: contactAI
    });
  } catch (error) {
    console.error('Error in GET /api/tax/ai-scan:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi trong quá trình AI quét thông tin doanh nghiệp' },
      { status: 500 }
    );
  }
}
