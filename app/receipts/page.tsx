import { Suspense } from "react";
import { DocumentList } from "@/components/documents/document-list";

function ReceiptsList() {
  return <DocumentList documentType="receipt" basePath="/receipts" />;
}

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<div className="p-6 animate-pulse">読み込み中...</div>}>
      <ReceiptsList />
    </Suspense>
  );
}
