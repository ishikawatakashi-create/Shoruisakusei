import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toStoredDate } from "@/lib/utils";
import type { DocumentType, DocumentStatus, DocumentSortField } from "@/types/document";

type DocumentClient = Prisma.TransactionClient | typeof prisma;

export interface DocumentListParams {
  documentType: DocumentType;
  search?: string;
  status?: DocumentStatus;
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  sortBy?: DocumentSortField;
  sortOrder?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export interface DocumentCreateInput {
  documentType: string;
  documentNumber: string;
  status?: string;
  issueDate: Date;
  validUntil?: Date | null;
  deliveryDate?: Date | null;
  deliveryPlace?: string;
  paymentDueDate?: Date | null;
  bankAccountId?: string;
  bankAccountText?: string;
  withholdingTax?: boolean;
  withholdingAmount?: number;
  receiptDate?: Date | null;
  addressee?: string;
  proviso?: string;
  paymentMethod?: string;
  isReissue?: boolean;
  showStampNotice?: boolean;
  clientId?: string;
  clientDisplayName?: string;
  clientDepartment?: string;
  clientContactName?: string;
  clientHonorific?: string;
  clientAddress?: string;
  subject?: string;
  notes?: string;
  internalMemo?: string;
  tags?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  sourceDocumentId?: string;
  relatedDocIds?: string;
  items?: {
    sortOrder: number;
    date?: Date | null;
    productName: string;
    description?: string;
    unitPrice: number;
    quantity: number;
    unit?: string;
    taxRate: number;
    taxCategory: string;
    amount: number;
    memo?: string;
  }[];
}

export const documentRepository = {
  async findMany(params: DocumentListParams) {
    const {
      documentType,
      search,
      status,
      dateFrom,
      dateTo,
      clientId,
      sortBy = "updatedAt",
      sortOrder = "desc",
      page = 1,
      perPage = 50,
    } = params;

    const where: Record<string, unknown> = { documentType };

    if (status && status !== "archived") {
      where.status = status;
    } else if (!status) {
      where.status = { not: "archived" };
    }

    if (search) {
      where.OR = [
        { documentNumber: { contains: search } },
        { clientDisplayName: { contains: search } },
        { subject: { contains: search } },
        { notes: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) (where.issueDate as Record<string, unknown>).gte = toStoredDate(dateFrom);
      if (dateTo) (where.issueDate as Record<string, unknown>).lte = toStoredDate(dateTo);
    }

    if (clientId) where.clientId = clientId;

    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.document.count({ where }),
    ]);

    return { documents, total, page, perPage };
  },

  async findById(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } }, client: true },
    });
  },

  async create(data: DocumentCreateInput, client: DocumentClient = prisma) {
    const { items, ...docData } = data;
    return client.document.create({
      data: {
        ...docData,
        items: items
          ? { create: items }
          : undefined,
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
  },

  async update(id: string, data: DocumentCreateInput, client: DocumentClient = prisma) {
    const { items, ...docData } = data;

    await client.documentItem.deleteMany({ where: { documentId: id } });

    return client.document.update({
      where: { id },
      data: {
        ...docData,
        items: items
          ? { create: items }
          : undefined,
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
  },

  async delete(id: string) {
    return prisma.document.delete({ where: { id } });
  },

  async updateStatus(id: string, status: DocumentStatus) {
    return prisma.document.update({
      where: { id },
      data: { status },
    });
  },

  async updatePdfPath(id: string, pdfPath: string) {
    return prisma.document.update({
      where: { id },
      data: { pdfPath },
    });
  },
};
