"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

interface Breadcrumb {
  label: string;
  href?: string;
}

function getBreadcrumbs(pathname: string): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [{ label: "ホーム", href: "/" }];

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return crumbs;

  const sectionLabels: Record<string, string> = {
    estimates: "見積書",
    "delivery-notes": "納品書",
    invoices: "請求書",
    receipts: "領収書",
    clients: "取引先",
    products: "品目",
    "bank-accounts": "振込先",
    settings: "設定",
  };

  const sectionHrefs: Record<string, string> = {
    estimates: "/estimates",
    "delivery-notes": "/delivery-notes",
    invoices: "/invoices",
    receipts: "/receipts",
    clients: "/clients",
    products: "/products",
    "bank-accounts": "/bank-accounts",
    settings: "/settings",
  };

  if (segments[0] && sectionLabels[segments[0]]) {
    const section = segments[0];
    if (segments.length === 1) {
      crumbs.push({ label: `${sectionLabels[section]}一覧` });
    } else {
      crumbs.push({
        label: `${sectionLabels[section]}一覧`,
        href: sectionHrefs[section],
      });

      if (segments[1] === "new") {
        crumbs.push({ label: `${sectionLabels[section]}作成` });
      } else if (segments.length >= 3 && segments[2] === "edit") {
        crumbs.push({ label: `${sectionLabels[section]}編集` });
      } else if (segments[1] === "business") {
        crumbs.push({ label: "事業者設定" });
      } else if (segments[1] === "backup") {
        crumbs.push({ label: "データ管理" });
      }
    }
  }

  return crumbs;
}

const PAGE_TITLES: Record<string, string> = {
  "/": "ダッシュボード",
  "/estimates": "見積書一覧",
  "/estimates/new": "見積書作成",
  "/delivery-notes": "納品書一覧",
  "/delivery-notes/new": "納品書作成",
  "/invoices": "請求書一覧",
  "/invoices/new": "請求書作成",
  "/receipts": "領収書一覧",
  "/receipts/new": "領収書作成",
  "/clients": "取引先管理",
  "/products": "品目管理",
  "/bank-accounts": "振込先管理",
  "/settings": "設定",
  "/settings/business": "事業者設定",
  "/settings/backup": "データ管理",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.match(/\/estimates\/.*\/edit/)) return "見積書編集";
  if (pathname.match(/\/delivery-notes\/.*\/edit/)) return "納品書編集";
  if (pathname.match(/\/invoices\/.*\/edit/)) return "請求書編集";
  if (pathname.match(/\/receipts\/.*\/edit/)) return "領収書編集";
  return "書類作成";
}

export function Header() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-[#d9dce0] bg-white">
      {/* Breadcrumb bar */}
      <div className="flex h-[36px] items-center gap-1 border-b border-[#ebedf0] px-5 text-[11px] text-[#8a8a8a]">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-[#c0c4cc]" />}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-[#4a9cf5] hover:text-[#2d7fd3] hover:underline"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-[#666]">{crumb.label}</span>
            )}
          </span>
        ))}
      </div>
      {/* Title bar */}
      <div className="flex h-[48px] items-center px-5">
        <h1 className="text-[16px] font-bold text-[#333]">{title}</h1>
      </div>
    </header>
  );
}
