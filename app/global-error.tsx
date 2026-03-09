"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <head>
        <style>{`
          .global-error-body { margin: 0; font-family: system-ui, sans-serif; background: #f0f2f5; }
          .global-error-wrap { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
          .global-error-card { max-width: 400px; text-align: center; background: #fff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
          .global-error-title { font-size: 18px; color: #333; margin: 0 0 8px; }
          .global-error-desc { font-size: 13px; color: #666; margin: 0 0 20px; line-height: 1.5; }
          .global-error-btn { padding: 10px 20px; font-size: 14px; font-weight: 500; color: #fff; background: #4a9cf5; border: none; border-radius: 6px; cursor: pointer; }
          .global-error-hint { font-size: 11px; color: #999; margin-top: 16px; }
        `}</style>
      </head>
      <body className="global-error-body">
        <div className="global-error-wrap">
          <div className="global-error-card">
            <h1 className="global-error-title">エラーが発生しました</h1>
            <p className="global-error-desc">
              ページの読み込み中に問題が起きました。再読み込みをお試しください。
            </p>
            <button type="button" className="global-error-btn" onClick={() => reset()}>
              再読み込み
            </button>
            <p className="global-error-hint">
              解決しない場合は、ブラウザのキャッシュを削除するか、新しいタブで開いてください。
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
