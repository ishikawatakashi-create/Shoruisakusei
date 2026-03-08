import { documentRepository, type DocumentCreateInput } from "@/repositories/document";
import { generateDocumentNumber } from "@/services/numbering";
import type { DocumentType, DocumentFormData } from "@/types/document";

function formDataToCreateInput(data: DocumentFormData): DocumentCreateInput {
  return {
    documentType: data.documentType,
    documentNumber: data.documentNumber,
    status: data.status || "draft",
    issueDate: new Date(data.issueDate),
    validUntil: data.validUntil ? new Date(data.validUntil) : null,
    deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
    deliveryPlace: data.deliveryPlace || undefined,
    paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
    bankAccountId: data.bankAccountId || undefined,
    bankAccountText: data.bankAccountText || "",
    withholdingTax: data.withholdingTax || false,
    withholdingAmount: data.withholdingAmount || 0,
    receiptDate: data.receiptDate ? new Date(data.receiptDate) : null,
    addressee: data.addressee || undefined,
    proviso: data.proviso || undefined,
    paymentMethod: data.paymentMethod || undefined,
    isReissue: data.isReissue || false,
    showStampNotice: data.showStampNotice || false,
    clientId: data.clientId || undefined,
    clientDisplayName: data.clientDisplayName || "",
    clientDepartment: data.clientDepartment || "",
    clientContactName: data.clientContactName || "",
    clientHonorific: data.clientHonorific || "御中",
    clientAddress: data.clientAddress || "",
    subject: data.subject || "",
    notes: data.notes || "",
    internalMemo: data.internalMemo || "",
    tags: data.tags || "",
    subtotal: data.subtotal || 0,
    taxAmount: data.taxAmount || 0,
    totalAmount: data.totalAmount || 0,
    sourceDocumentId: data.sourceDocumentId || undefined,
    relatedDocIds: data.relatedDocIds || "",
    items: data.items.map((item) => ({
      sortOrder: item.sortOrder,
      date: item.date ? new Date(item.date) : null,
      productName: item.productName,
      description: item.description || "",
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      unit: item.unit || "",
      taxRate: item.taxRate,
      taxCategory: item.taxCategory,
      amount: item.amount,
      memo: item.memo || "",
    })),
  };
}

export const documentService = {
  async create(data: DocumentFormData) {
    if (!data.documentNumber) {
      data.documentNumber = await generateDocumentNumber(data.documentType);
    }
    const input = formDataToCreateInput(data);
    return documentRepository.create(input);
  },

  async update(id: string, data: DocumentFormData) {
    const input = formDataToCreateInput(data);
    return documentRepository.update(id, input);
  },

  async duplicate(id: string) {
    const original = await documentRepository.findById(id);
    if (!original) throw new Error("Document not found");

    const newNumber = await generateDocumentNumber(original.documentType as DocumentType);

    const newDoc: DocumentFormData = {
      documentType: original.documentType as DocumentType,
      documentNumber: newNumber,
      status: "draft",
      issueDate: new Date().toISOString().split("T")[0],
      validUntil: original.validUntil?.toISOString().split("T")[0],
      deliveryDate: original.deliveryDate?.toISOString().split("T")[0],
      deliveryPlace: original.deliveryPlace || undefined,
      paymentDueDate: original.paymentDueDate?.toISOString().split("T")[0],
      bankAccountId: original.bankAccountId || undefined,
      bankAccountText: original.bankAccountText,
      withholdingTax: original.withholdingTax,
      withholdingAmount: original.withholdingAmount,
      clientId: original.clientId || undefined,
      clientDisplayName: original.clientDisplayName,
      clientDepartment: original.clientDepartment,
      clientContactName: original.clientContactName,
      clientHonorific: original.clientHonorific,
      clientAddress: original.clientAddress,
      subject: original.subject,
      notes: original.notes,
      internalMemo: "",
      tags: original.tags,
      items: original.items.map((item: Record<string, any>) => ({
        sortOrder: item.sortOrder,
        date: item.date?.toISOString().split("T")[0],
        productName: item.productName,
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        unit: item.unit,
        taxRate: item.taxRate,
        taxCategory: item.taxCategory as DocumentFormData["items"][0]["taxCategory"],
        amount: item.amount,
        memo: item.memo,
      })),
      subtotal: original.subtotal,
      taxAmount: original.taxAmount,
      totalAmount: original.totalAmount,
      sourceDocumentId: undefined,
      relatedDocIds: "",
    };

    const input = formDataToCreateInput(newDoc);
    return documentRepository.create(input);
  },

  async convert(id: string, targetType: DocumentType) {
    const original = await documentRepository.findById(id);
    if (!original) throw new Error("Document not found");

    const newNumber = await generateDocumentNumber(targetType);
    const today = new Date().toISOString().split("T")[0];

    const newDoc: DocumentFormData = {
      documentType: targetType,
      documentNumber: newNumber,
      status: "draft",
      issueDate: today,
      clientId: original.clientId || undefined,
      clientDisplayName: original.clientDisplayName,
      clientDepartment: original.clientDepartment,
      clientContactName: original.clientContactName,
      clientHonorific: original.clientHonorific,
      clientAddress: original.clientAddress,
      subject: original.subject,
      notes: original.notes,
      internalMemo: "",
      tags: original.tags,
      items: original.items.map((item: Record<string, any>) => ({
        sortOrder: item.sortOrder,
        date: item.date?.toISOString().split("T")[0],
        productName: item.productName,
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        unit: item.unit,
        taxRate: item.taxRate,
        taxCategory: item.taxCategory as DocumentFormData["items"][0]["taxCategory"],
        amount: item.amount,
        memo: item.memo,
      })),
      subtotal: original.subtotal,
      taxAmount: original.taxAmount,
      totalAmount: original.totalAmount,
      sourceDocumentId: original.id,
      relatedDocIds: original.id,
    };

    if (targetType === "delivery_note") {
      newDoc.deliveryDate = today;
    } else if (targetType === "invoice") {
      newDoc.paymentDueDate = undefined;
      newDoc.bankAccountId = original.bankAccountId || undefined;
      newDoc.bankAccountText = original.bankAccountText;
    } else if (targetType === "receipt") {
      newDoc.receiptDate = today;
      newDoc.addressee = original.clientDisplayName;
      newDoc.proviso = original.subject || "お品代として";
      newDoc.paymentMethod = "transfer";
    }

    const input = formDataToCreateInput(newDoc);
    const created = await documentRepository.create(input);

    const existingRelated = original.relatedDocIds
      ? original.relatedDocIds.split(",").filter(Boolean)
      : [];
    existingRelated.push(created.id);
    await prisma.document.update({
      where: { id: original.id },
      data: { relatedDocIds: existingRelated.join(",") },
    });

    return created;
  },
};

import { prisma } from "@/lib/prisma";
