import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DocumentForm } from "@/components/documents/document-form";
import { documentToFormData } from "@/services/document";
import { Button } from "@/components/ui/button";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!doc) notFound();

    const initialData = documentToFormData(doc);
    return <DocumentForm documentType="invoice" documentId={id} initialData={initialData} mode="edit" />;
  } catch (error) {
    console.error("[invoices/[id]/edit]", error);
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="mb-4 text-sm text-amber-800">データの取得に失敗しました。データベース接続を確認してください。</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/invoices">一覧へ戻る</Link>
        </Button>
      </div>
    );
  }
}
