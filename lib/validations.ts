import { z } from "zod";

export const documentTypeSchema = z.enum(["estimate", "delivery_note", "invoice", "receipt"]);
export const documentStatusSchema = z.enum(["draft", "issued", "sent", "paid", "receipted", "archived"]);
export const documentSortFieldSchema = z.enum(["updatedAt", "issueDate", "createdAt", "totalAmount"]);
export const sortOrderSchema = z.enum(["asc", "desc"]);
export const roundingMethodSchema = z.enum(["floor", "ceil", "round"]);
export const taxCalculationSchema = z.enum(["exclusive", "inclusive"]);
export const paymentMethodSchema = z.enum(["cash", "transfer", "card", "other"]);

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付形式が不正です");

const documentItemSchema = z.object({
  sortOrder: z.number().int().min(0),
  date: dateOnlySchema.optional(),
  productName: z.string().min(1, "品目名は必須です"),
  description: z.string().default(""),
  unitPrice: z.number().finite().min(0, "単価は0以上"),
  quantity: z.number().finite().min(0, "数量は0以上"),
  unit: z.string().default(""),
  taxRate: z.number().finite().min(0),
  taxCategory: z.enum(["taxable_10", "taxable_8", "exempt", "non_target"]),
  amount: z.number().finite().min(0),
  memo: z.string().default(""),
});

export const documentFormSchema = z.object({
  documentType: documentTypeSchema,
  documentNumber: z.string().trim().default(""),
  status: documentStatusSchema.default("draft"),
  issueDate: dateOnlySchema,
  validUntil: dateOnlySchema.optional(),
  deliveryDate: dateOnlySchema.optional(),
  deliveryPlace: z.string().optional(),
  paymentDueDate: dateOnlySchema.optional(),
  bankAccountId: z.string().optional(),
  bankAccountText: z.string().optional(),
  withholdingTax: z.boolean().optional(),
  withholdingAmount: z.number().finite().optional(),
  receiptDate: dateOnlySchema.optional(),
  addressee: z.string().optional(),
  proviso: z.string().optional(),
  paymentMethod: paymentMethodSchema.optional(),
  isReissue: z.boolean().optional(),
  showStampNotice: z.boolean().optional(),
  clientId: z.string().optional(),
  clientDisplayName: z.string().min(1, "取引先名は必須です"),
  clientDepartment: z.string().default(""),
  clientContactName: z.string().default(""),
  clientHonorific: z.string().default("御中"),
  clientAddress: z.string().default(""),
  subject: z.string().min(1, "件名は必須です"),
  notes: z.string().default(""),
  internalMemo: z.string().default(""),
  tags: z.string().default(""),
  items: z.array(documentItemSchema).min(1, "明細は1行以上必要です"),
  subtotal: z.number().finite().default(0),
  taxAmount: z.number().finite().default(0),
  totalAmount: z.number().finite().default(0),
  sourceDocumentId: z.string().optional(),
  relatedDocIds: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.items.some((item) => item.productName.trim().length > 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "品目名が入力された明細を1行以上追加してください",
      path: ["items"],
    });
  }

  if (data.documentType === "estimate" && !data.validUntil) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "有効期限は必須です",
      path: ["validUntil"],
    });
  }

  if (data.documentType === "delivery_note" && !data.deliveryDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "納品日は必須です",
      path: ["deliveryDate"],
    });
  }

  if (data.documentType === "invoice" && !data.paymentDueDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "支払期限は必須です",
      path: ["paymentDueDate"],
    });
  }

  if (data.documentType === "receipt" && !data.proviso?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "但し書きは必須です",
      path: ["proviso"],
    });
  }
});

export const documentListQuerySchema = z.object({
  type: documentTypeSchema,
  search: z.string().optional(),
  status: documentStatusSchema.optional(),
  dateFrom: z
    .union([dateOnlySchema, z.literal("")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  dateTo: z
    .union([dateOnlySchema, z.literal("")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  clientId: z.string().optional(),
  sortBy: documentSortFieldSchema.default("updatedAt"),
  sortOrder: sortOrderSchema.default("desc"),
  page: z.coerce
    .number()
    .int()
    .positive()
    .catch(1)
    .default(1),
  perPage: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .catch(50)
    .default(50),
});

export const clientFormSchema = z.object({
  name: z.string().min(1, "取引先名は必須です"),
  clientType: z.enum(["corporate", "individual"]).default("corporate"),
  department: z.string().default(""),
  contactPerson: z.string().default(""),
  honorific: z.string().default("御中"),
  postalCode: z.string().default(""),
  address: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  paymentTerms: z.string().default(""),
  defaultSubject: z.string().default(""),
  defaultNotes: z.string().default(""),
  tags: z.string().default(""),
  bankAccountId: z.string().optional(),
});

export const productFormSchema = z.object({
  name: z.string().min(1, "品目名は必須です"),
  description: z.string().default(""),
  unitPrice: z.number().min(0, "単価は0以上"),
  unit: z.string().default(""),
  taxRate: z.number().min(0).default(10),
  defaultQuantity: z.number().min(0).default(1),
  sortOrder: z.number().int().default(0),
  tags: z.string().default(""),
});

export const bankAccountFormSchema = z.object({
  bankName: z.string().min(1, "銀行名は必須です"),
  branchName: z.string().default(""),
  accountType: z.enum(["ordinary", "checking", "savings"]).default("ordinary"),
  accountNumber: z.string().default(""),
  accountHolder: z.string().default(""),
  displayText: z.string().default(""),
  isDefault: z.boolean().default(false),
});

export const businessInfoFormSchema = z.object({
  businessName: z.string().default(""),
  tradeName: z.string().default(""),
  representativeName: z.string().default(""),
  postalCode: z.string().default(""),
  address: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  invoiceRegistrationNo: z.string().default(""),
  logoPath: z.string().default(""),
  sealPath: z.string().default(""),
  defaultHonorific: z.string().default("御中"),
  defaultNotes: z.string().default(""),
  taxCalculation: taxCalculationSchema.default("exclusive"),
  roundingMethod: roundingMethodSchema.default("floor"),
  defaultPaymentTerms: z.string().default(""),
  defaultBankAccountId: z.string().optional(),
});

export type DocumentFormValues = z.infer<typeof documentFormSchema>;
export type ClientFormValues = z.infer<typeof clientFormSchema>;
export type ProductFormValues = z.infer<typeof productFormSchema>;
export type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>;
export type BusinessInfoFormValues = z.infer<typeof businessInfoFormSchema>;
