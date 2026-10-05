'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface TaxInfoActionsProps {
  taxId: string;
}

export function TaxInfoActions({ taxId }: TaxInfoActionsProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(taxId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2 text-xs">
      <button
        onClick={copyToClipboard}
        className="w-full bg-[#fed700] hover:bg-[#e0b200] text-gray-900 font-semibold py-2 px-3 rounded flex items-center justify-center space-x-2 transition"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copied ? 'Đã sao chép MST!' : 'Sao chép mã số thuế'}</span>
      </button>

      <Link
        href="/lien-he"
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded flex items-center justify-center space-x-2 transition text-center"
      >
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Báo sai / Ẩn thông tin</span>
      </Link>
    </div>
  );
}

export function RefreshTaxButton({ taxId }: { taxId: string }) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetch('/api/tax/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxId })
      });
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={loading}
      className="inline-flex items-center space-x-1.5 bg-[#d9534f] hover:bg-[#c9302c] active:bg-[#ac2925] text-white px-2.5 py-1 rounded text-[11px] font-bold transition shadow-sm disabled:opacity-60 cursor-pointer align-middle ml-1"
    >
      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
      <span>{loading ? 'Đang cập nhật...' : 'Cập nhật'}</span>
    </button>
  );
}
