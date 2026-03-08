"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="max-w-md rounded-lg border border-[#e0e3e7] bg-white p-8 text-center shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-[#333]">エラーが発生しました</h2>
        <p className="mb-6 text-sm text-[#666]">
          ページの読み込みに失敗しました。再読み込みをお試しください。
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-[#4a9cf5] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2d7fd3]"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}
