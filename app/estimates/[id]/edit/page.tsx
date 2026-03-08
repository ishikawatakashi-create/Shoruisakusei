import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DocumentForm } from "@/components/documents/document-form";
import type { DocumentFormData, TaxCategory } from "@/types/document";

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!doc) notFound();

  const initialData: DocumentFormData = {
    documentType: doc.documentType as DocumentFormData["documentType"],
    documentNumber: doc.documentNumber,
    status: doc.status as DocumentFormData["status"],
    issueDate: doc.issueDate.toISOString().split("T")[0],
    validUntil: doc.validUntil?.toISOString().split("T")[0],
    deliveryDate: doc.deliveryDate?.toISOString().split("T")[0],
    deliveryPlace: doc.deliveryPlace || undefined,
    paymentDueDate: doc.paymentDueDate?.toISOString().split("T")[0],
    bankAccountId: doc.bankAccountId || undefined,
    bankAccountText: doc.bankAccountText,
    withholdingTax: doc.withholdingTax,
    withholdingAmount: doc.withholdingAmount,
    receiptDate: doc.receiptDate?.toISOString().split("T")[0],
    addressee: doc.addressee || undefined,
    proviso: doc.proviso || undefined,
    paymentMethod: (doc.paymentMethod as DocumentFormData["paymentMethod"]) || undefined,
    isReissue: doc.isReissue,
    showStampNotice: doc.showStampNotice,
    clientId: doc.clientId || undefined,
    clientDisplayName: doc.clientDisplayName,
    clientDepartment: doc.clientDepartment,
    clientContactName: doc.clientContactName,
    clientHonorific: doc.clientHonorific,
    clientAddress: doc.clientAddress,
    subject: doc.subject,
    notes: doc.notes,
    internalMemo: doc.internalMemo,
    tags: doc.tags,
    items: doc.items.map((item: Record<string, any>) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      date: item.date?.toISOString().split("T")[0],
      productName: item.productName,
      description: item.description,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      unit: item.unit,
      taxRate: item.taxRate,
      taxCategory: item.taxCategory as TaxCategory,
      amount: item.amount,
      memo: item.memo,
    })),
    subtotal: doc.subtotal,
    taxAmount: doc.taxAmount,
    totalAmount: doc.totalAmount,
    sourceDocumentId: doc.sourceDocumentId || undefined,
    relatedDocIds: doc.relatedDocIds,
  };

  return <DocumentForm documentType="estimate" documentId={id} initialData={initialData} mode="edit" />;
}
