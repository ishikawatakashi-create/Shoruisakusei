import { DocumentForm } from "@/components/documents/document-form";

export default function NewInvoicePage() {
  return <DocumentForm documentType="invoice" mode="create" />;
}
