import test from "node:test";
import assert from "node:assert/strict";
import { documentFormSchema } from "../../lib/validations";

function createBaseDocument(documentType: "estimate" | "delivery_note" | "invoice" | "receipt") {
  return {
    documentType,
    documentNumber: "",
    status: "draft" as const,
    issueDate: "2026-03-08",
    clientDisplayName: "テスト株式会社",
    clientDepartment: "",
    clientContactName: "",
    clientHonorific: "御中",
    clientAddress: "",
    subject: "テスト件名",
    notes: "",
    internalMemo: "",
    tags: "",
    items: [
      {
        sortOrder: 0,
        productName: "作業費",
        description: "",
        unitPrice: 1000,
        quantity: 1,
        unit: "式",
        taxRate: 10,
        taxCategory: "taxable_10" as const,
        amount: 1000,
        memo: "",
      },
    ],
    subtotal: 1000,
    taxAmount: 100,
    totalAmount: 1100,
  };
}

test("documentFormSchema allows blank document numbers for save-time numbering", () => {
  const result = documentFormSchema.safeParse({
    ...createBaseDocument("invoice"),
    paymentDueDate: "2026-03-31",
  });

  assert.equal(result.success, true);
});

test("documentFormSchema requires paymentDueDate for invoices", () => {
  const result = documentFormSchema.safeParse(createBaseDocument("invoice"));

  assert.equal(result.success, false);
  assert.equal(result.error.issues.some((issue) => issue.path.join(".") === "paymentDueDate"), true);
});

test("documentFormSchema requires proviso for receipts", () => {
  const result = documentFormSchema.safeParse({
    ...createBaseDocument("receipt"),
    receiptDate: "2026-03-08",
    proviso: "   ",
  });

  assert.equal(result.success, false);
  assert.equal(result.error.issues.some((issue) => issue.path.join(".") === "proviso"), true);
});

test("documentFormSchema rejects item arrays without any named rows", () => {
  const result = documentFormSchema.safeParse({
    ...createBaseDocument("estimate"),
    validUntil: "2026-03-31",
    items: [
      {
        sortOrder: 0,
        productName: "   ",
        description: "",
        unitPrice: 1000,
        quantity: 1,
        unit: "式",
        taxRate: 10,
        taxCategory: "taxable_10" as const,
        amount: 1000,
        memo: "",
      },
    ],
  });

  assert.equal(result.success, false);
  assert.equal(result.error.issues.some((issue) => issue.path.join(".") === "items"), true);
});
