import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "書類作成 - 帳票管理アプリ",
  description: "見積書・納品書・請求書・領収書を作成・管理するローカルWebアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.className} min-h-screen bg-[#f0f2f5] antialiased`}>
        <Sidebar />
        <div className="ml-[200px] flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 p-5">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
