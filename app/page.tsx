import Link from "next/link";
import { FileText, Truck, Receipt, CreditCard, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getStats() {
  const [estimates, deliveryNotes, invoices, receipts] = await Promise.all([
    prisma.document.count({ where: { documentType: "estimate", status: { not: "archived" } } }),
    prisma.document.count({ where: { documentType: "delivery_note", status: { not: "archived" } } }),
    prisma.document.count({ where: { documentType: "invoice", status: { not: "archived" } } }),
    prisma.document.count({ where: { documentType: "receipt", status: { not: "archived" } } }),
  ]);

  const recentDocs = await prisma.document.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { client: true },
  });

  return { estimates, deliveryNotes, invoices, receipts, recentDocs };
}

const docTypes = [
  { type: "estimate", label: "見積書", icon: FileText, href: "/estimates", iconBg: "bg-[#eaf4fd]", iconColor: "text-[#4a9cf5]" },
  { type: "delivery_note", label: "納品書", icon: Truck, href: "/delivery-notes", iconBg: "bg-[#e6f7ee]", iconColor: "text-[#27ae60]" },
  { type: "invoice", label: "請求書", icon: Receipt, href: "/invoices", iconBg: "bg-[#fef5e7]", iconColor: "text-[#e67e22]" },
  { type: "receipt", label: "領収書", icon: CreditCard, href: "/receipts", iconBg: "bg-[#f3eafd]", iconColor: "text-[#8e44ad]" },
];

export default async function DashboardPage() {
  const stats = await getStats();
  const counts: Record<string, number> = {
    estimate: stats.estimates,
    delivery_note: stats.deliveryNotes,
    invoice: stats.invoices,
    receipt: stats.receipts,
  };

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {docTypes.map((dt) => {
          const Icon = dt.icon;
          return (
            <Card key={dt.type} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-1">
                <CardTitle className="text-[12px] font-medium text-[#8a8a8a]">
                  {dt.label}
                </CardTitle>
                <div className={`rounded p-1.5 ${dt.iconBg}`}>
                  <Icon className={`h-4 w-4 ${dt.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-[22px] font-bold text-[#333]">{counts[dt.type]}<span className="text-[13px] font-normal text-[#8a8a8a] ml-0.5">件</span></div>
                <div className="mt-3 flex gap-2">
                  <Link href={`${dt.href}/new`}>
                    <Button size="sm" className="gap-1">
                      <Plus className="h-3 w-3" />
                      新規作成
                    </Button>
                  </Link>
                  <Link href={dt.href}>
                    <Button size="sm" variant="outline" className="gap-1">
                      一覧
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader className="border-b border-[#ebedf0] pb-3">
          <CardTitle>最近の書類</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-0">
          {stats.recentDocs.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f2f5]">
                <FileText className="h-6 w-6 text-[#b0b5ba]" />
              </div>
              <p className="text-[13px] text-[#8a8a8a]">
                まだ書類がありません
              </p>
              <p className="mt-1 text-[12px] text-[#b0b5ba]">
                新しく作成してみましょう
              </p>
            </div>
          ) : (
            <div>
              {stats.recentDocs.map((doc: { id: string; documentType: string; documentNumber: string; clientDisplayName: string; subject: string; totalAmount: number; updatedAt: Date }, i: number) => {
                const typeInfo = docTypes.find((d) => d.type === doc.documentType);
                const editPath = `${typeInfo?.href}/${doc.id}/edit`;
                return (
                  <Link
                    key={doc.id}
                    href={editPath}
                    className={`flex items-center justify-between px-5 py-3 hover:bg-[#f9fafb] transition-colors ${i > 0 ? "border-t border-[#ebedf0]" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${typeInfo?.iconBg} ${typeInfo?.iconColor}`}>
                        {typeInfo?.label}
                      </span>
                      <span className="text-[13px] font-mono text-[#555]">{doc.documentNumber}</span>
                      <span className="text-[13px] text-[#333]">{doc.clientDisplayName}</span>
                      {doc.subject && (
                        <span className="text-[12px] text-[#8a8a8a]">{doc.subject}</span>
                      )}
                    </div>
                    <span className="text-[13px] font-medium text-[#333]">
                      {new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", minimumFractionDigits: 0 }).format(doc.totalAmount)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
