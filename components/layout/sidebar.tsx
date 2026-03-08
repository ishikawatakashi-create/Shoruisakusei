"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Truck,
  Receipt,
  CreditCard,
  Users,
  Package,
  Building2,
  Settings,
  Database,
  LayoutDashboard,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  createHref?: string;
}

const documentItems: NavItem[] = [
  { label: "作成", href: "/", icon: LayoutDashboard },
  { label: "見積書", href: "/estimates", icon: FileText, createHref: "/estimates/new" },
  { label: "納品書", href: "/delivery-notes", icon: Truck, createHref: "/delivery-notes/new" },
  { label: "請求書", href: "/invoices", icon: Receipt, createHref: "/invoices/new" },
  { label: "領収書", href: "/receipts", icon: CreditCard, createHref: "/receipts/new" },
];

const managementItems: NavItem[] = [
  { label: "取引先", href: "/clients", icon: Users },
  { label: "品目", href: "/products", icon: Package },
  { label: "振込先", href: "/bank-accounts", icon: Building2 },
];

const systemItems: NavItem[] = [
  { label: "設定", href: "/settings", icon: Settings },
  { label: "データ管理", href: "/settings/backup", icon: Database },
];

function SidebarItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.href === "/"
    ? pathname === "/"
    : pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <div className="flex items-center group">
      <Link
        href={item.href}
        className={cn(
          "flex flex-1 items-center gap-2.5 px-4 py-2 text-[13px] transition-colors border-l-[3px]",
          isActive
            ? "bg-[#354b5e] text-white font-medium border-l-[#4a9cf5]"
            : "text-[#bdc3c7] hover:bg-[#354b5e] hover:text-white border-l-transparent"
        )}
      >
        <Icon className="h-[15px] w-[15px] shrink-0 opacity-80" />
        <span>{item.label}</span>
      </Link>
      {item.createHref && (
        <Link
          href={item.createHref}
          className="mr-2 flex h-5 w-5 items-center justify-center rounded text-[#7f8c9a] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#435d73] hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function SidebarSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      {title && (
        <div className="px-4 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7f8c9a]">
          {title}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[200px] flex-col bg-[#2c3e50] select-none">
      {/* Logo */}
      <div className="flex h-[52px] items-center gap-2 border-b border-[#384d63] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-[#4a9cf5]">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <Link href="/" className="text-[14px] font-bold text-white tracking-wide">
          書類作成
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto pt-2 pb-4">
        <SidebarSection>
          {documentItems.map((item) => (
            <SidebarItem key={item.href} item={item} />
          ))}
        </SidebarSection>

        <div className="mx-4 my-2 h-px bg-[#384d63]" />

        <SidebarSection title="マスタ管理">
          {managementItems.map((item) => (
            <SidebarItem key={item.href} item={item} />
          ))}
        </SidebarSection>

        <div className="mx-4 my-2 h-px bg-[#384d63]" />

        <SidebarSection>
          {systemItems.map((item) => (
            <SidebarItem key={item.href} item={item} />
          ))}
        </SidebarSection>
      </nav>
    </aside>
  );
}
