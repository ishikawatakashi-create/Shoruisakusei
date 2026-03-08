import { DocumentList } from "@/components/documents/document-list";

export default function DeliveryNotesPage() {
  return <DocumentList documentType="delivery_note" basePath="/delivery-notes" />;
}
