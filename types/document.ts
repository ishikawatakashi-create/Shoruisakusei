export type DocumentType = "estimate" | "delivery_note" | "invoice" | "receipt";

export type DocumentStatus =
  | "draft"
  | "issued"
  | "sent"
  | "paid"
  | "receipted"
  | "archived";

export type TaxCategory =
  | "taxable_10"
  | "taxable_8"
  | "exempt"
  | "non_target";

export type PaymentMethod = "cash" | "transfer" | "card" | "other";

export type RoundingMethod = "floor" | "ceil" | "round";

export type TaxCalculation = "exclusive" | "inclusive";

export type DocumentSortField = "updatedAt" | "issueDate" | "createdAt" | "totalAmount";

export type AccountType = "ordinary" | "checking" | "savings";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  estimate: "見積書",
  delivery_note: "納品書",
  invoice: "請求書",
  receipt: "領収書",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "下書き",
  issued: "発行済み",
  sent: "送付済み",
  paid: "入金済み",
  receipted: "領収済み",
  archived: "アーカイブ",
};

export const TAX_CATEGORY_LABELS: Record<TaxCategory, string> = {
  taxable_10: "課税10%",
  taxable_8: "課税8%",
  exempt: "非課税",
  non_target: "対象外",
};

export const TAX_RATE_MAP: Record<TaxCategory, number> = {
  taxable_10: 10,
  taxable_8: 8,
  exempt: 0,
  non_target: 0,
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "現金",
  transfer: "振込",
  card: "カード",
  other: "その他",
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ordinary: "普通",
  checking: "当座",
  savings: "貯蓄",
};

export const DOCUMENT_NUMBER_PREFIXES: Record<DocumentType, string> = {
  estimate: "EST",
  delivery_note: "DEL",
  invoice: "INV",
  receipt: "REC",
};

export interface DocumentItemFormData {
  id?: string;
  sortOrder: number;
  date?: string;
  productName: string;
  description: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  taxRate: number;
  taxCategory: TaxCategory;
  amount: number;
  memo: string;
}

export interface DocumentFormData {
  documentType: DocumentType;
  documentNumber: string;
  status: DocumentStatus;
  issueDate: string;
  validUntil?: string;
  deliveryDate?: string;
  deliveryPlace?: string;
  paymentDueDate?: string;
  bankAccountId?: string;
  bankAccountText?: string;
  withholdingTax?: boolean;
  withholdingAmount?: number;
  receiptDate?: string;
  addressee?: string;
  proviso?: string;
  paymentMethod?: PaymentMethod;
  isReissue?: boolean;
  showStampNotice?: boolean;
  clientId?: string;
  clientDisplayName: string;
  clientDepartment: string;
  clientContactName: string;
  clientHonorific: string;
  clientAddress: string;
  subject: string;
  notes: string;
  internalMemo: string;
  tags: string;
  items: DocumentItemFormData[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  sourceDocumentId?: string;
  relatedDocIds?: string;
}

export interface TaxBreakdown {
  taxRate: number;
  label: string;
  subtotal: number;
  taxAmount: number;
}

export interface TaxCalculationOptions {
  roundingMethod?: RoundingMethod;
  taxCalculation?: TaxCalculation;
}

export function calculateItemAmount(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}

export function calculateTotals(
  items: DocumentItemFormData[],
  options: TaxCalculationOptions = {}
): { subtotal: number; taxAmount: number; totalAmount: number; taxBreakdown: TaxBreakdown[] } {
  const roundingMethod = options.roundingMethod ?? "floor";
  const taxCalculation = options.taxCalculation ?? "exclusive";
  const roundFn =
    roundingMethod === "floor"
      ? Math.floor
      : roundingMethod === "ceil"
        ? Math.ceil
        : Math.round;

  const taxGroups: Record<string, { label: string; taxableBase: number; gross: number; rate: number }> = {};
  let grossTotal = 0;

  for (const item of items) {
    const amount = calculateItemAmount(item.unitPrice, item.quantity);
    grossTotal += amount;

    const key = item.taxCategory;
    if (!taxGroups[key]) {
      taxGroups[key] = {
        label: TAX_CATEGORY_LABELS[item.taxCategory],
        taxableBase: 0,
        gross: 0,
        rate: TAX_RATE_MAP[item.taxCategory],
      };
    }

    const rate = taxGroups[key].rate;
    const taxableBase =
      taxCalculation === "inclusive" && rate > 0
        ? amount - roundFn((amount * rate) / (100 + rate))
        : amount;

    taxGroups[key].taxableBase += taxableBase;
    taxGroups[key].gross += amount;
  }

  let taxAmount = 0;
  const taxBreakdown: TaxBreakdown[] = [];

  for (const [, group] of Object.entries(taxGroups)) {
    const groupTax =
      taxCalculation === "inclusive" && group.rate > 0
        ? group.gross - group.taxableBase
        : roundFn((group.taxableBase * group.rate) / 100);

    taxAmount += groupTax;
    taxBreakdown.push({
      taxRate: group.rate,
      label: group.label,
      subtotal: group.taxableBase,
      taxAmount: groupTax,
    });
  }

  const subtotal = taxCalculation === "inclusive" ? grossTotal - taxAmount : grossTotal;
  const totalAmount = taxCalculation === "inclusive" ? grossTotal : subtotal + taxAmount;

  return {
    subtotal,
    taxAmount,
    totalAmount,
    taxBreakdown,
  };
}

export function calculateWithholdingTax(amount: number): number {
  if (amount <= 1000000) {
    return Math.floor(amount * 0.1021);
  }
  return Math.floor(1000000 * 0.1021 + (amount - 1000000) * 0.2042);
}

export const CONVERSION_MAP: Partial<Record<DocumentType, DocumentType[]>> = {
  estimate: ["delivery_note", "invoice"],
  delivery_note: ["invoice"],
  invoice: ["receipt"],
};
