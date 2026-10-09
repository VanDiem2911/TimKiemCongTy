import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { runCrawler, ALL_PROVINCES } from '../../../../../scripts/crawler.mjs';
import { runTratencongtyScraper } from '../../../../../scripts/scrape-tratencongty.mjs';

interface CrawlerState {
  isRunning: boolean;
  targetCount: number;
  currentCount: number;
  percent: number;
  message: string;
  startedAt: string | null;
  lastUpdated: string | null;
}

// Global in-memory state for tracking background crawl task
const globalCrawlerState: CrawlerState = {
  isRunning: false,
  targetCount: 5000,
  currentCount: 0,
  percent: 0,
  message: 'Sẵn sàng',
  startedAt: null,
  lastUpdated: null,
};

interface CrawlerProgress {
  currentTotal: number;
  percent: number;
  targetCount: number;
  latestCompany?: string;
}

interface CrawlerRunner {
  (options: {
    targetCount: number;
    enrichDetails: boolean;
    enrichCount: number;
    onProgress: (p: CrawlerProgress) => void;
    shouldStop?: () => boolean;
  }): Promise<void>;
}

const EMPTY_STATS = { total: 0, provincesCount: 0, withDateCount: 0, withPhoneCount: 0, provinces: [] as Array<{ slug: string; name: string; count: number }> };

// Thống kê kho dữ liệu đọc thẳng từ MongoDB (collection companies)
async function getDatasetStats() {
  try {
    const db = await getDb();
    if (!db) return EMPTY_STATS;
    const coll = db.collection('companies');

    const [byProvince, withDateCount, withPhoneCount] = await Promise.all([
      coll.aggregate<{ _id: string | null; count: number }>([{ $group: { _id: '$provinceSlug', count: { $sum: 1 } } }]).toArray(),
      coll.countDocuments({ startDate: { $nin: [null, ''] } }),
      coll.countDocuments({ phone: { $nin: [null, '', 'Bị ẩn theo yêu cầu người dùng'] } }),
    ]);

    let total = 0;
    const provinces: Array<{ slug: string; name: string; count: number }> = [];
    for (const row of byProvince) {
      total += row.count;
      if (!row._id) continue;
      const meta = ALL_PROVINCES.find((p) => p.slug === row._id);
      provinces.push({ slug: row._id, name: meta ? meta.name : row._id, count: row.count });
    }
    provinces.sort((a, b) => b.count - a.count);

    return { total, provincesCount: provinces.length, withDateCount, withPhoneCount, provinces };
  } catch {
    return EMPTY_STATS;
  }
}

export async function GET() {
  try {
    const stats = await getDatasetStats();
    globalCrawlerState.currentCount = stats.total;

    return NextResponse.json({
      success: true,
      stats,
      crawler: globalCrawlerState,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'start';
    const target = parseInt(body.target || '5000', 10);
    const enrich = body.enrich !== undefined ? Boolean(body.enrich) : true;

    if (action === 'start') {
      if (globalCrawlerState.isRunning) {
        return NextResponse.json({
          success: false,
          message: 'Công cụ cào dữ liệu đang chạy, vui lòng chờ hoàn tất!',
          crawler: globalCrawlerState,
        });
      }

      globalCrawlerState.isRunning = true;
      globalCrawlerState.targetCount = target;
      globalCrawlerState.startedAt = new Date().toISOString();
      globalCrawlerState.message = `Đang bắt đầu cào mục tiêu ${target.toLocaleString('vi-VN')} DN (kèm SĐT & Ngày)...`;

      // Chạy ngầm trong background (không block request)
      (async () => {
        try {
          const runner = runCrawler as unknown as CrawlerRunner;
          await runner({
            targetCount: target,
            enrichDetails: true,
            enrichCount: Math.min(5000, target),
            shouldStop: () => !globalCrawlerState.isRunning,
            onProgress: (p: CrawlerProgress) => {
              globalCrawlerState.currentCount = p.currentTotal;
              globalCrawlerState.percent = p.percent;
              globalCrawlerState.message = `Đã thu thập: ${p.currentTotal.toLocaleString('vi-VN')} / ${p.targetCount.toLocaleString('vi-VN')} DN (${p.percent}%)`;
              globalCrawlerState.lastUpdated = new Date().toISOString();
            },
          });
          globalCrawlerState.isRunning = false;
          globalCrawlerState.percent = 100;
          globalCrawlerState.message = `Đã hoàn tất cào ${target.toLocaleString('vi-VN')} doanh nghiệp!`;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          globalCrawlerState.isRunning = false;
          globalCrawlerState.message = `Lỗi trong quá trình cào: ${errMsg}`;
        }
      })();

      return NextResponse.json({
        success: true,
        message: `Đã kích hoạt cào dữ liệu với mục tiêu ${target.toLocaleString('vi-VN')} doanh nghiệp!`,
        crawler: globalCrawlerState,
      });
    }

    if (action === 'enrich') {
      if (globalCrawlerState.isRunning) {
        return NextResponse.json({
          success: false,
          message: 'Công cụ cào dữ liệu đang chạy, vui lòng chờ hoàn tất!',
          crawler: globalCrawlerState,
        });
      }

      globalCrawlerState.isRunning = true;
      globalCrawlerState.targetCount = target || 3000;
      globalCrawlerState.startedAt = new Date().toISOString();
      globalCrawlerState.message = `Đang bắt đầu bổ sung SĐT & Ngày cho các DN hiện có trong kho...`;

      (async () => {
        try {
          const runner = runCrawler as unknown as CrawlerRunner;
          await runner({
            targetCount: 0,
            enrichDetails: true,
            enrichCount: target || 5000,
            shouldStop: () => !globalCrawlerState.isRunning,
            onProgress: (p: CrawlerProgress) => {
              globalCrawlerState.currentCount = p.currentTotal;
              globalCrawlerState.percent = p.percent;
              globalCrawlerState.message = `[${p.currentTotal}/${p.targetCount} - ${p.percent}%] ${p.latestCompany || ''}`;
              globalCrawlerState.lastUpdated = new Date().toISOString();
            },
          });
          globalCrawlerState.isRunning = false;
          globalCrawlerState.percent = 100;
          globalCrawlerState.message = `Đã hoàn tất bổ sung SĐT & Ngày cho doanh nghiệp!`;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          globalCrawlerState.isRunning = false;
          globalCrawlerState.message = `Lỗi trong quá trình bổ sung: ${errMsg}`;
        }
      })();

      return NextResponse.json({
        success: true,
        message: `Đã kích hoạt bổ sung SĐT & Ngày cho các doanh nghiệp hiện có!`,
        crawler: globalCrawlerState,
      });
    }

    if (action === 'tratencongty') {
      if (globalCrawlerState.isRunning) {
        return NextResponse.json({
          success: false,
          message: 'Công cụ cào dữ liệu đang chạy, vui lòng chờ hoàn tất!',
          crawler: globalCrawlerState,
        });
      }

      const wanted = Math.max(1, parseInt(body.target || '500', 10));
      globalCrawlerState.isRunning = true;
      globalCrawlerState.targetCount = wanted;
      globalCrawlerState.percent = 0;
      globalCrawlerState.startedAt = new Date().toISOString();
      globalCrawlerState.message = `Đang khởi động cào tratencongty.com (mục tiêu ${wanted.toLocaleString('vi-VN')} DN mới, không trùng)...`;

      (async () => {
        try {
          const st = await runTratencongtyScraper({
            resume: true,
            pages: 2000,
            maxNew: wanted,
            shouldStop: () => !globalCrawlerState.isRunning,
            onProgress: (p: { page: number; added: number; dupes: number; rejected: number; latest: string }) => {
              globalCrawlerState.percent = Math.min(99, Math.round((p.added / wanted) * 100));
              globalCrawlerState.message = `[tratencongty] Trang ${p.page} · +${p.added}/${wanted.toLocaleString('vi-VN')} DN mới · trùng ${p.dupes} · loại ${p.rejected}${p.latest ? ' · ' + p.latest : ''}`;
              globalCrawlerState.lastUpdated = new Date().toISOString();
            },
          });
          globalCrawlerState.isRunning = false;
          globalCrawlerState.percent = 100;
          globalCrawlerState.message = `Hoàn tất: thêm ${st.added.toLocaleString('vi-VN')} DN mới từ tratencongty.com (bỏ ${st.dupes} trùng, loại ${st.rejected} do OCR không khớp). Đã lưu MongoDB: ${st.mongoSaved.toLocaleString('vi-VN')}${st.mongoErrors ? ` (lỗi ${st.mongoErrors} lô)` : ''}.`;
        } catch (err: unknown) {
          globalCrawlerState.isRunning = false;
          globalCrawlerState.message = `Lỗi cào tratencongty: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
      })();

      return NextResponse.json({
        success: true,
        message: `Đã kích hoạt cào tratencongty.com, mục tiêu ${wanted.toLocaleString('vi-VN')} doanh nghiệp mới!`,
        crawler: globalCrawlerState,
      });
    }

    if (action === 'stop') {
      globalCrawlerState.isRunning = false;
      globalCrawlerState.message = 'Đã gửi yêu cầu dừng.';
      return NextResponse.json({ success: true, crawler: globalCrawlerState });
    }

    return NextResponse.json({ success: false, message: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
