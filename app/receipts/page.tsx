import { DocumentList } from "@/components/documents/document-list";

export default function ReceiptsPage() {
  return <DocumentList documentType="receipt" basePath="/receipts" />;
}
