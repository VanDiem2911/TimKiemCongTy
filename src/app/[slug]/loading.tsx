import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function LoadingDetailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfb]">
      <Header />

      <main className="flex-1">
        <div className="mst-container py-4">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center space-x-2 mb-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-28" />
            <div className="h-4 bg-gray-200 rounded w-4" />
            <div className="h-4 bg-gray-200 rounded w-36" />
            <div className="h-4 bg-gray-200 rounded w-4" />
            <div className="h-4 bg-gray-200 rounded w-48" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols Skeleton */}
            <div className="lg:col-span-8 space-y-6">
              {/* Header Box Skeleton */}
              <div className="bg-white border border-gray-200 rounded p-6 shadow-sm animate-pulse space-y-4">
                <div className="h-7 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-10 bg-amber-50 rounded border border-amber-100" />
              </div>

              {/* Table Skeleton */}
              <div className="bg-white border border-gray-200 rounded p-6 shadow-sm animate-pulse space-y-3">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right 4 Cols Skeleton */}
            <aside className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-gray-200 rounded p-5 shadow-sm animate-pulse space-y-3">
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-full" />
                <div className="h-8 bg-gray-200 rounded w-full" />
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
