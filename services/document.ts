import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { fromStoredDate, toStoredDate, todayDateOnly } from "@/lib/utils";
import { documentRepository, type DocumentCreateInput } from "@/repositories/document";
import { isDocumentNumberUnique, reserveDocumentNumber } from "@/services/numbering";
import type {
  DocumentFormData,
  DocumentType,
  PaymentMethod,
  RoundingMethod,
  TaxCalculation,
  TaxCategory,
} from "@/types/document";
import {
  ACCOUNT_TYPE_LABELS,
  calculateItemAmount,
  calculateTotals,
  calculateWithholdingTax,
  CONVERSION_MAP,
  TAX_RATE_MAP,
} from "@/types/document";

type DocumentClient = Prisma.TransactionClient | typeof prisma;

type DocumentWithItems = Prisma.DocumentGetPayload<{
  include: { items: true };
}>;

interface BusinessDefaults {
  defaultHonorific: string;
  defaultNotes: string;
  defaultPaymentTerms: string;
  defaultBankAccountId?: string;
  taxCalculation: TaxCalculation;
  roundingMethod: RoundingMethod;
}

function normalizeTaxCalculation(value?: string): TaxCalculation {
  return value === "inclusive" ? "inclusive" : "exclusive";
}

function normalizeRoundingMethod(value?: string): RoundingMethod {
  if (value === "ceil" || value === "round") {
    return value;
  }
  return "floor";
}

function formatBankAccountDisplay(account: {
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  displayText: string;
}) {
  if (account.displayText) {
    return account.displayText;
  }

  return [
    account.bankName,
    account.branchName,
    ACCOUNT_TYPE_LABELS[account.accountType as keyof typeof ACCOUNT_TYPE_LABELS] ?? account.accountType,
    account.accountNumber,
    account.accountHolder,
  ]
    .filter(Boolean)
    .join(" ");
}

async function loadBusinessDefaults(client: DocumentClient): Promise<BusinessDefaults> {
  const info = await client.businessInfo.findUnique({
    where: { id: "default" },
  });

  return {
    defaultHonorific: info?.defaultHonorific || "御中",
    defaultNotes: info?.defaultNotes || "",
    defaultPaymentTerms: info?.defaultPaymentTerms || "",
    defaultBankAccountId: info?.defaultBankAccountId || undefined,
    taxCalculation: normalizeTaxCalculation(info?.taxCalculation),
    roundingMethod: normalizeRoundingMethod(info?.roundingMethod),
  };
}

async function resolveBankAccountText(
  client: DocumentClient,
  bankAccountId?: string,
  fallbackText?: string
) {
  if (!bankAccountId) {
    return fallbackText || "";
  }

  const account = await client.bankAccount.findUnique({
    where: { id: bankAccountId },
  });

  if (!account) {
    return fallbackText || "";
  }

  return formatBankAccountDisplay(account);
}

async function normalizeFormData(
  data: DocumentFormData,
  client: DocumentClient
): Promise<DocumentFormData> {
  const businessDefaults = await loadBusinessDefaults(client);

  const items = data.items
    .filter((item) => item.productName.trim())
    .map((item, index) => {
      const taxRate = TAX_RATE_MAP[item.taxCategory];
      return {
        ...item,
        sortOrder: index,
        taxRate,
        amount: calculateItemAmount(item.unitPrice, item.quantity),
      };
    });

  const { subtotal, taxAmount, totalAmount } = calculateTotals(items, {
    roundingMethod: businessDefaults.roundingMethod,
    taxCalculation: businessDefaults.taxCalculation,
  });

  const bankAccountId =
    data.documentType === "invoice"
      ? data.bankAccountId || businessDefaults.defaultBankAccountId
      : data.bankAccountId;

  const bankAccountText = await resolveBankAccountText(
    client,
    bankAccountId,
    data.bankAccountText
  );

  const withholdingAmount =
    data.withholdingTax && data.documentType === "invoice"
      ? calculateWithholdingTax(subtotal)
      : 0;

  return {
    ...data,
    documentNumber: data.documentNumber.trim(),
    clientHonorific: data.clientHonorific || businessDefaults.defaultHonorific,
    notes: data.notes || businessDefaults.defaultNotes,
    bankAccountId,
    bankAccountText,
    items,
    subtotal,
    taxAmount,
    totalAmount: totalAmount - withholdingAmount,
    withholdingAmount,
  };
}

async function buildCreateInput(
  data: DocumentFormData,
  client: DocumentClient,
  options: {
    existingId?: string;
    existingNumber?: string;
  } = {}
): Promise<DocumentCreateInput> {
  const normalized = await normalizeFormData(data, client);

  let documentNumber = normalized.documentNumber;
  if (!documentNumber && options.existingNumber) {
    documentNumber = options.existingNumber;
  }

  if (!documentNumber) {
    documentNumber = await reserveDocumentNumber(normalized.documentType, client);
  }

  const isUnique = await isDocumentNumberUnique(
    normalized.documentType,
    documentNumber,
    options.existingId,
    client
  );
  if (!isUnique) {
    throw new ConflictError("書類番号が重複しています");
  }

  return {
    documentType: normalized.documentType,
    documentNumber,
    status: normalized.status,
    issueDate: toStoredDate(normalized.issueDate)!,
    validUntil: toStoredDate(normalized.validUntil),
    deliveryDate: toStoredDate(normalized.deliveryDate),
    deliveryPlace: normalized.deliveryPlace || undefined,
    paymentDueDate: toStoredDate(normalized.paymentDueDate),
    bankAccountId: normalized.bankAccountId || undefined,
    bankAccountText: normalized.bankAccountText || "",
    withholdingTax: normalized.withholdingTax || false,
    withholdingAmount: normalized.withholdingAmount || 0,
    receiptDate: toStoredDate(normalized.receiptDate),
    addressee: normalized.addressee || undefined,
    proviso: normalized.proviso || undefined,
    paymentMethod: normalized.paymentMethod || undefined,
    isReissue: normalized.isReissue || false,
    showStampNotice: normalized.showStampNotice || false,
    clientId: normalized.clientId || undefined,
    clientDisplayName: normalized.clientDisplayName,
    clientDepartment: normalized.clientDepartment,
    clientContactName: normalized.clientContactName,
    clientHonorific: normalized.clientHonorific,
    clientAddress: normalized.clientAddress,
    subject: normalized.subject,
    notes: normalized.notes,
    internalMemo: normalized.internalMemo,
    tags: normalized.tags,
    subtotal: normalized.subtotal,
    taxAmount: normalized.taxAmount,
    totalAmount: normalized.totalAmount,
    sourceDocumentId: normalized.sourceDocumentId || undefined,
    relatedDocIds: normalized.relatedDocIds || "",
    items: normalized.items.map((item) => ({
      sortOrder: item.sortOrder,
      date: toStoredDate(item.date),
      productName: item.productName,
      description: item.description,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      unit: item.unit,
      taxRate: item.taxRate,
      taxCategory: item.taxCategory,
      amount: item.amount,
      memo: item.memo,
    })),
  };
}

export function documentToFormData(doc: DocumentWithItems): DocumentFormData {
  return {
    documentType: doc.documentType as DocumentType,
    documentNumber: doc.documentNumber,
    status: doc.status as DocumentFormData["status"],
    issueDate: fromStoredDate(doc.issueDate) || todayDateOnly(),
    validUntil: fromStoredDate(doc.validUntil),
    deliveryDate: fromStoredDate(doc.deliveryDate),
    deliveryPlace: doc.deliveryPlace || undefined,
    paymentDueDate: fromStoredDate(doc.paymentDueDate),
    bankAccountId: doc.bankAccountId || undefined,
    bankAccountText: doc.bankAccountText,
    withholdingTax: doc.withholdingTax,
    withholdingAmount: doc.withholdingAmount,
    receiptDate: fromStoredDate(doc.receiptDate),
    addressee: doc.addressee || undefined,
    proviso: doc.proviso || undefined,
    paymentMethod: (doc.paymentMethod as PaymentMethod) || undefined,
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
    items: doc.items.map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      date: fromStoredDate(item.date),
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
}

export const documentService = {
  async create(data: DocumentFormData) {
    return prisma.$transaction(async (tx) => {
      const input = await buildCreateInput(data, tx);
      return documentRepository.create(input, tx);
    });
  },

  async update(id: string, data: DocumentFormData) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.document.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new NotFoundError("Document not found");
      }

      if (existing.documentType !== data.documentType) {
        throw new BadRequestError("書類種別は変更できません");
      }

      const input = await buildCreateInput(data, tx, {
        existingId: id,
        existingNumber: existing.documentNumber,
      });

      return documentRepository.update(id, input, tx);
    });
  },

  async duplicate(id: string) {
    return prisma.$transaction(async (tx) => {
      const original = await tx.document.findUnique({
        where: { id },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });

      if (!original) {
        throw new NotFoundError("Document not found");
      }

      const duplicated = documentToFormData(original);
      duplicated.documentNumber = "";
      duplicated.status = "draft";
      duplicated.issueDate = todayDateOnly();
      duplicated.internalMemo = "";
      duplicated.sourceDocumentId = undefined;
      duplicated.relatedDocIds = "";

      const input = await buildCreateInput(duplicated, tx);
      return documentRepository.create(input, tx);
    });
  },

  async convert(id: string, targetType: DocumentType) {
    return prisma.$transaction(async (tx) => {
      const original = await tx.document.findUnique({
        where: { id },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });

      if (!original) {
        throw new NotFoundError("Document not found");
      }

      const sourceType = original.documentType as DocumentType;
      if (!CONVERSION_MAP[sourceType]?.includes(targetType)) {
        throw new BadRequestError("変換できない書類種別です");
      }

      const today = todayDateOnly();
      const converted = documentToFormData(original);
      converted.documentType = targetType;
      converted.documentNumber = "";
      converted.status = "draft";
      converted.issueDate = today;
      converted.internalMemo = "";
      converted.sourceDocumentId = original.id;

      const inheritedRelatedIds = new Set(
        [original.id, ...original.relatedDocIds.split(",")]
          .map((value) => value.trim())
          .filter(Boolean)
      );
      converted.relatedDocIds = Array.from(inheritedRelatedIds).join(",");

      if (targetType === "delivery_note") {
        converted.deliveryDate = today;
      }

      if (targetType === "invoice") {
        converted.paymentDueDate = undefined;
      }

      if (targetType === "receipt") {
        converted.receiptDate = today;
        converted.addressee = original.clientDisplayName;
        converted.proviso = original.subject || "お品代として";
        converted.paymentMethod = "transfer";
      }

      const input = await buildCreateInput(converted, tx);
      const created = await documentRepository.create(input, tx);

      inheritedRelatedIds.add(created.id);
      await tx.document.update({
        where: { id: original.id },
        data: { relatedDocIds: Array.from(inheritedRelatedIds).join(",") },
      });

      return created;
    });
  },
};
