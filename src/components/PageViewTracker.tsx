'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/** Gửi lượt xem trang về máy chủ để ghi vào nhật ký thao tác (không chặn giao diện). */
export default function PageViewTracker() {
  const pathname = usePathname();
  const last = useRef('');

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || last.current === pathname) return;
    last.current = pathname;
    try {
      const body = JSON.stringify({ path: pathname });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
      }
    } catch {
      // ghi nhật ký thất bại không được ảnh hưởng người dùng
    }
  }, [pathname]);

  return null;
}
