import { Suspense } from "react";
import { DocumentList } from "@/components/documents/document-list";

function EstimatesList() {
  return <DocumentList documentType="estimate" basePath="/estimates" />;
}

export default function EstimatesPage() {
  return (
    <Suspense fallback={<div className="p-6 animate-pulse">読み込み中...</div>}>
      <EstimatesList />
    </Suspense>
  );
}
