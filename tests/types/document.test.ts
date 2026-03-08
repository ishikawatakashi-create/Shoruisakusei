import test from "node:test";
import assert from "node:assert/strict";
import { calculateTotals, type DocumentItemFormData } from "../../types/document";

test("calculateTotals applies exclusive tax consistently", () => {
  const items: DocumentItemFormData[] = [
    {
      sortOrder: 0,
      productName: "課税項目",
      description: "",
      unitPrice: 1000,
      quantity: 1,
      unit: "式",
      taxRate: 10,
      taxCategory: "taxable_10",
      amount: 1000,
      memo: "",
    },
    {
      sortOrder: 1,
      productName: "非課税項目",
      description: "",
      unitPrice: 500,
      quantity: 1,
      unit: "式",
      taxRate: 0,
      taxCategory: "exempt",
      amount: 500,
      memo: "",
    },
  ];

  const totals = calculateTotals(items, {
    roundingMethod: "floor",
    taxCalculation: "exclusive",
  });

  assert.equal(totals.subtotal, 1500);
  assert.equal(totals.taxAmount, 100);
  assert.equal(totals.totalAmount, 1600);
  assert.deepEqual(totals.taxBreakdown, [
    {
      taxRate: 10,
      label: "課税10%",
      subtotal: 1000,
      taxAmount: 100,
    },
    {
      taxRate: 0,
      label: "非課税",
      subtotal: 500,
      taxAmount: 0,
    },
  ]);
});

test("calculateTotals derives net and tax from tax-inclusive amounts", () => {
  const items: DocumentItemFormData[] = [
    {
      sortOrder: 0,
      productName: "10%内税",
      description: "",
      unitPrice: 1100,
      quantity: 1,
      unit: "式",
      taxRate: 10,
      taxCategory: "taxable_10",
      amount: 1100,
      memo: "",
    },
    {
      sortOrder: 1,
      productName: "8%内税",
      description: "",
      unitPrice: 1080,
      quantity: 1,
      unit: "式",
      taxRate: 8,
      taxCategory: "taxable_8",
      amount: 1080,
      memo: "",
    },
  ];

  const totals = calculateTotals(items, {
    roundingMethod: "floor",
    taxCalculation: "inclusive",
  });

  assert.equal(totals.subtotal, 2000);
  assert.equal(totals.taxAmount, 180);
  assert.equal(totals.totalAmount, 2180);
  assert.deepEqual(totals.taxBreakdown, [
    {
      taxRate: 10,
      label: "課税10%",
      subtotal: 1000,
      taxAmount: 100,
    },
    {
      taxRate: 8,
      label: "課税8%",
      subtotal: 1000,
      taxAmount: 80,
    },
  ]);
});
