import { Suspense } from "react";
import { DocumentList } from "@/components/documents/document-list";

function DeliveryNotesList() {
  return <DocumentList documentType="delivery_note" basePath="/delivery-notes" />;
}

export default function DeliveryNotesPage() {
  return (
    <Suspense fallback={<div className="p-6 animate-pulse">読み込み中...</div>}>
      <DeliveryNotesList />
    </Suspense>
  );
}
