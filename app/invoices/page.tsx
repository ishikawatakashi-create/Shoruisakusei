import { DocumentList } from "@/components/documents/document-list";

export default function InvoicesPage() {
  return <DocumentList documentType="invoice" basePath="/invoices" />;
}
