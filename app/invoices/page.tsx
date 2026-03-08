import { Suspense } from "react";
import { DocumentList } from "@/components/documents/document-list";

function InvoicesList() {
  return <DocumentList documentType="invoice" basePath="/invoices" />;
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-6 animate-pulse">読み込み中...</div>}>
      <InvoicesList />
    </Suspense>
  );
}
