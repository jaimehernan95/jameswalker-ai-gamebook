import React from 'react';

export const BookShelfSkeleton: React.FC = () => (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12" aria-busy="true">
    <div className="border-b border-[#E2E0D8] pb-8 mb-10">
      <div className="h-4 w-48 bg-[#E2E0D8] rounded mb-4" />
      <div className="h-10 w-3/4 max-w-xl bg-[#E2E0D8] rounded mb-4" />
      <div className="h-5 w-2/3 max-w-lg bg-[#F3F1EA] rounded" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[0, 1, 2].map((idx) => (
        <div
          key={idx}
          className="border border-[#E2E0D8] bg-white rounded-lg p-5 flex flex-col justify-between min-h-[460px]"
        >
          <div>
            <div className="aspect-[3/4] w-full bg-[#F3F1EA] rounded border border-[#E2E0D8] mb-5" />
            <div className="h-3 w-32 bg-[#E2E0D8] rounded mb-3" />
            <div className="h-6 w-5/6 bg-[#E2E0D8] rounded mb-2" />
            <div className="h-4 w-full bg-[#F3F1EA] rounded mb-1.5" />
            <div className="h-4 w-4/5 bg-[#F3F1EA] rounded" />
          </div>
          <div className="h-11 w-full bg-[#E2E0D8] rounded mt-6" />
        </div>
      ))}
    </div>
  </div>
);

export const ChapterPlayerSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8" aria-busy="true">
    <div className="border-b border-[#E2E0D8] pb-5 mb-8">
      <div className="h-3 w-40 bg-[#E2E0D8] rounded mb-3" />
      <div className="h-8 w-2/3 bg-[#E2E0D8] rounded mb-4" />
      <div className="h-1.5 w-full bg-[#F3F1EA] rounded" />
    </div>
    <div className="border border-[#E2E0D8] bg-white rounded-lg p-6 sm:p-8 min-h-[420px]">
      <div className="h-3 w-28 bg-[#E2E0D8] rounded mb-4" />
      <div className="h-7 w-3/4 bg-[#E2E0D8] rounded mb-6" />
      <div className="space-y-3 mb-8">
        <div className="h-4 w-full bg-[#F3F1EA] rounded" />
        <div className="h-4 w-11/12 bg-[#F3F1EA] rounded" />
        <div className="h-4 w-4/5 bg-[#F3F1EA] rounded" />
      </div>
      <div className="space-y-3 pt-4 border-t border-[#E2E0D8]">
        <div className="h-14 w-full bg-[#F3F1EA] rounded border border-[#E2E0D8]" />
        <div className="h-14 w-full bg-[#F3F1EA] rounded border border-[#E2E0D8]" />
      </div>
    </div>
  </div>
);

export const PromptArenaSkeleton: React.FC = () => (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8" aria-busy="true">
    <div className="h-8 w-64 bg-[#E2E0D8] rounded mb-6" />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 h-[480px] bg-white border border-[#E2E0D8] rounded-lg p-6" />
      <div className="lg:col-span-7 h-[480px] bg-white border border-[#E2E0D8] rounded-lg p-6" />
    </div>
  </div>
);
