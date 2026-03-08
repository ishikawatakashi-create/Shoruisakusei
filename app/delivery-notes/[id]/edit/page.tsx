import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DocumentForm } from "@/components/documents/document-form";
import { documentToFormData } from "@/services/document";

export default async function EditDeliveryNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!doc) notFound();

  const initialData = documentToFormData(doc);
  return <DocumentForm documentType="delivery_note" documentId={id} initialData={initialData} mode="edit" />;
}
