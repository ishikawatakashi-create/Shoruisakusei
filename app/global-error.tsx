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
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f0f2f5" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              maxWidth: 400,
              textAlign: "center",
              background: "#fff",
              padding: 32,
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h1 style={{ fontSize: 18, color: "#333", margin: "0 0 8px" }}>
              エラーが発生しました
            </h1>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 20px", lineHeight: 1.5 }}>
              ページの読み込み中に問題が起きました。再読み込みをお試しください。
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                color: "#fff",
                background: "#4a9cf5",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              再読み込み
            </button>
            <p style={{ fontSize: 11, color: "#999", marginTop: 16 }}>
              解決しない場合は、ブラウザのキャッシュを削除するか、新しいタブで開いてください。
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
