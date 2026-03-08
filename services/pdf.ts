import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TYPE_LABELS } from "@/types/document";
import type { DocumentType } from "@/types/document";

export async function generatePdf(documentId: string): Promise<string> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!doc) throw new Error("Document not found");

  const businessInfo = await prisma.businessInfo.findUnique({
    where: { id: "default" },
  });

  const pdfDir = path.join(process.cwd(), "data", "pdfs");
  await mkdir(pdfDir, { recursive: true });

  const filename = `${doc.documentNumber.replace(/[/\\:]/g, "-")}_${Date.now()}.pdf`;
  const filePath = path.join(pdfDir, filename);

  const html = buildPdfHtml(doc, businessInfo);

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });
  } finally {
    await browser.close();
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { pdfPath: `/data/pdfs/${filename}` },
  });

  return `/data/pdfs/${filename}`;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPdfHtml(doc: any, businessInfo: any): string {
  const docType = doc.documentType as DocumentType;
  const title = DOCUMENT_TYPE_LABELS[docType];

  const taxGroups: Record<string, { label: string; subtotal: number; rate: number }> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of doc.items as any[]) {
    const key = item.taxCategory;
    if (!taxGroups[key]) {
      taxGroups[key] = {
        label:
          item.taxCategory === "taxable_10"
            ? "課税10%"
            : item.taxCategory === "taxable_8"
              ? "課税8%"
              : item.taxCategory === "exempt"
                ? "非課税"
                : "対象外",
        subtotal: 0,
        rate:
          item.taxCategory === "taxable_10"
            ? 10
            : item.taxCategory === "taxable_8"
              ? 8
              : 0,
      };
    }
    taxGroups[key].subtotal += item.amount;
  }

  let taxBreakdownHtml = "";
  for (const [, g] of Object.entries(taxGroups)) {
    const tax = Math.floor((g.subtotal * g.rate) / 100);
    taxBreakdownHtml += `<tr><td style="font-size:9px;color:#666;padding:2px 8px">${g.label}</td><td style="font-size:9px;text-align:right;padding:2px 8px">${formatCurrency(tax)}</td></tr>`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemRows = (doc.items as any[])
    .map(
      (item) => `
    <tr>
      <td style="border:1px solid #ddd;padding:4px 6px">${item.productName}${item.description ? `<br><span style="font-size:9px;color:#888">${item.description}</span>` : ""}</td>
      <td style="border:1px solid #ddd;padding:4px 6px;text-align:right">${formatCurrency(item.unitPrice)}</td>
      <td style="border:1px solid #ddd;padding:4px 6px;text-align:right">${item.quantity}</td>
      <td style="border:1px solid #ddd;padding:4px 6px;text-align:center">${item.unit}</td>
      <td style="border:1px solid #ddd;padding:4px 6px;text-align:right">${formatCurrency(item.amount)}</td>
    </tr>`
    )
    .join("");

  const totalLabel =
    docType === "estimate"
      ? "御見積金額"
      : docType === "invoice"
        ? "ご請求金額"
        : docType === "receipt"
          ? "領収金額"
          : "合計金額";

  let extraInfo = "";
  if (docType === "estimate" && doc.validUntil) {
    extraInfo += `<div>有効期限: ${formatDate(doc.validUntil)}</div>`;
  }
  if (docType === "delivery_note" && doc.deliveryDate) {
    extraInfo += `<div>納品日: ${formatDate(doc.deliveryDate)}</div>`;
  }
  if (docType === "invoice" && doc.paymentDueDate) {
    extraInfo += `<div>お支払期限: ${formatDate(doc.paymentDueDate)}</div>`;
  }
  if (docType === "receipt" && doc.receiptDate) {
    extraInfo += `<div>領収日: ${formatDate(doc.receiptDate)}</div>`;
  }

  let bankInfo = "";
  if (docType === "invoice") {
    let bankText = doc.bankAccountText || "";
    if (!bankText && doc.bankAccountId) {
      bankText = "(振込先を設定してください)";
    }
    bankInfo = `
      <div style="margin-top:12px;font-size:10px">
        <div style="font-weight:bold;margin-bottom:4px">振込先</div>
        <div style="border-bottom:1px solid #333;padding-bottom:6px;min-height:16px">${bankText || "&nbsp;"}</div>
      </div>`;
  }

  let receiptExtra = "";
  if (docType === "receipt") {
    if (doc.proviso) {
      receiptExtra += `<div style="margin-bottom:8px;font-size:10px"><strong>但し:</strong> ${doc.proviso}</div>`;
    }
  }

  let withholdingHtml = "";
  if (doc.withholdingTax && doc.withholdingAmount > 0) {
    withholdingHtml = `<tr><td style="padding:4px 8px;color:#c00">源泉徴収税</td><td style="text-align:right;padding:4px 8px;color:#c00">-${formatCurrency(doc.withholdingAmount)}</td></tr>`;
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Noto Sans JP',sans-serif; font-size:11px; color:#333; line-height:1.6; }
  table { border-collapse:collapse; }
</style>
</head>
<body>
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="font-size:20px;letter-spacing:8px;font-weight:bold">${title}</h1>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:20px">
    <div style="width:48%">
      <div style="border-bottom:2px solid #333;padding-bottom:4px;margin-bottom:4px">
        <span style="font-size:14px;font-weight:bold">${doc.clientDisplayName}</span>
        ${doc.clientDepartment ? `<span style="font-size:10px;margin-left:4px">${doc.clientDepartment}</span>` : ""}
        ${doc.clientContactName ? `<span style="font-size:10px;margin-left:4px">${doc.clientContactName}</span>` : ""}
        <span style="margin-left:4px">${doc.clientHonorific}</span>
      </div>
      ${doc.clientAddress ? `<div style="font-size:10px;color:#666">${doc.clientAddress}</div>` : ""}
    </div>
    <div style="width:45%;text-align:right;font-size:10px">
      <div style="font-weight:bold;font-size:12px">${businessInfo?.businessName || ""}</div>
      ${businessInfo?.postalCode ? `<div>〒${businessInfo.postalCode}</div>` : ""}
      ${businessInfo?.address ? `<div>${businessInfo.address}</div>` : ""}
      ${businessInfo?.phone ? `<div>TEL: ${businessInfo.phone}</div>` : ""}
      ${businessInfo?.email ? `<div>${businessInfo.email}</div>` : ""}
      ${businessInfo?.invoiceRegistrationNo ? `<div style="margin-top:4px;font-size:9px">登録番号: ${businessInfo.invoiceRegistrationNo}</div>` : ""}
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:10px">
    <div>
      ${doc.subject ? `<div><strong>件名:</strong> ${doc.subject}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div>${title}番号: ${doc.documentNumber}</div>
      <div>発行日: ${formatDate(doc.issueDate)}</div>
      ${extraInfo}
    </div>
  </div>

  <div style="border:2px solid #333;border-radius:4px;padding:8px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-weight:bold;font-size:12px">${totalLabel}</span>
    <span style="font-size:18px;font-weight:bold">${formatCurrency(doc.totalAmount)}</span>
  </div>

  ${receiptExtra}

  <table style="width:100%;margin-bottom:16px">
    <thead>
      <tr style="background:#f5f5f5">
        <th style="border:1px solid #ddd;padding:4px 6px;text-align:left">品目</th>
        <th style="border:1px solid #ddd;padding:4px 6px;text-align:right;width:80px">単価</th>
        <th style="border:1px solid #ddd;padding:4px 6px;text-align:right;width:50px">数量</th>
        <th style="border:1px solid #ddd;padding:4px 6px;text-align:center;width:40px">単位</th>
        <th style="border:1px solid #ddd;padding:4px 6px;text-align:right;width:80px">金額</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
    <table style="width:220px">
      <tr><td style="padding:4px 8px;border-bottom:1px solid #ddd">小計</td><td style="text-align:right;padding:4px 8px;border-bottom:1px solid #ddd">${formatCurrency(doc.subtotal)}</td></tr>
      ${taxBreakdownHtml}
      <tr><td style="padding:4px 8px;border-bottom:1px solid #ddd">消費税</td><td style="text-align:right;padding:4px 8px;border-bottom:1px solid #ddd">${formatCurrency(doc.taxAmount)}</td></tr>
      ${withholdingHtml}
      <tr><td style="padding:4px 8px;font-weight:bold;border-bottom:2px solid #333">合計</td><td style="text-align:right;padding:4px 8px;font-weight:bold;font-size:14px;border-bottom:2px solid #333">${formatCurrency(doc.totalAmount)}</td></tr>
    </table>
  </div>

  ${bankInfo}

  <div style="margin-top:12px;font-size:10px">
    <div style="font-weight:bold;margin-bottom:4px">備考</div>
    <div style="border-bottom:1px solid #333;padding-bottom:6px;min-height:16px;white-space:pre-wrap;color:#555">${doc.notes || "&nbsp;"}</div>
  </div>

  ${
    docType === "receipt" && doc.showStampNotice && doc.totalAmount >= 50000
      ? `<div style="margin-top:16px;padding:8px;border:1px solid #f0a020;background:#fff8e8;border-radius:4px;font-size:9px;color:#a06000">※ 金額が5万円以上の場合、収入印紙の貼付が必要な場合があります。</div>`
      : ""
  }
</body>
</html>`;
}
