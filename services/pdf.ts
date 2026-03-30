import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import type { Browser } from "puppeteer";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  DOCUMENT_TYPE_LABELS,
  calculateTotals,
  type DocumentType,
  type DocumentItemFormData,
  type RoundingMethod,
  type TaxCalculation,
  type TaxCategory,
} from "@/types/document";

const isServerless = process.env.VERCEL === "1";
const PDF_FONT_FAMILY = "PdfNotoSansJP";
const PDF_FONT_FILES = {
  regular: path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    "noto-sans-jp",
    "files",
    "noto-sans-jp-japanese-400-normal.woff2"
  ),
  bold: path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    "noto-sans-jp",
    "files",
    "noto-sans-jp-japanese-700-normal.woff2"
  ),
} as const;

const globalForPdfBrowser = globalThis as typeof globalThis & {
  pdfBrowserPromise?: Promise<Browser>;
  pdfFontCssPromise?: Promise<string>;
};

async function getPdfBrowser(): Promise<Browser> {
  if (!globalForPdfBrowser.pdfBrowserPromise) {
    if (isServerless) {
      globalForPdfBrowser.pdfBrowserPromise = (async () => {
        const puppeteer = (await import("puppeteer-core")).default;
        const chromium = await import("@sparticuz/chromium");
        return puppeteer.launch({
          args: chromium.default.args,
          defaultViewport: chromium.default.defaultViewport,
          executablePath: await chromium.default.executablePath(),
          headless: chromium.default.headless,
        });
      })()
        .then((browser) => {
          browser.on("disconnected", () => {
            globalForPdfBrowser.pdfBrowserPromise = undefined;
          });
          return browser;
        })
        .catch((error) => {
          globalForPdfBrowser.pdfBrowserPromise = undefined;
          throw error;
        });
    } else {
      globalForPdfBrowser.pdfBrowserPromise = import("puppeteer")
        .then(({ default: puppeteer }) =>
          puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          })
        )
        .then((browser) => {
          browser.on("disconnected", () => {
            globalForPdfBrowser.pdfBrowserPromise = undefined;
          });
          return browser;
        })
        .catch((error) => {
          globalForPdfBrowser.pdfBrowserPromise = undefined;
          throw error;
        });
    }
  }

  return globalForPdfBrowser.pdfBrowserPromise;
}

async function getPdfFontCss(): Promise<string> {
  if (!globalForPdfBrowser.pdfFontCssPromise) {
    globalForPdfBrowser.pdfFontCssPromise = Promise.all([
      readFontAsDataUrl(PDF_FONT_FILES.regular),
      readFontAsDataUrl(PDF_FONT_FILES.bold),
    ])
      .then(
        ([regularFontDataUrl, boldFontDataUrl]) => `
@font-face {
  font-family: '${PDF_FONT_FAMILY}';
  font-style: normal;
  font-display: block;
  font-weight: 400;
  src: url(${regularFontDataUrl}) format('woff2');
}

@font-face {
  font-family: '${PDF_FONT_FAMILY}';
  font-style: normal;
  font-display: block;
  font-weight: 700;
  src: url(${boldFontDataUrl}) format('woff2');
}
`
      )
      .catch((error) => {
        globalForPdfBrowser.pdfFontCssPromise = undefined;
        throw error;
      });
  }

  return globalForPdfBrowser.pdfFontCssPromise;
}

async function readFontAsDataUrl(fontPath: string): Promise<string> {
  const fontBuffer = await readFile(fontPath);
  return `data:font/woff2;base64,${fontBuffer.toString("base64")}`;
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
    timeZone: "UTC",
  }).format(d);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toMultilineHtml(value: unknown, emptyFallback = "&nbsp;"): string {
  const safeText = escapeHtml(value);
  return safeText ? safeText.replace(/\r?\n/g, "<br>") : emptyFallback;
}

export type GeneratePdfResult = { buffer: Buffer; filename: string };

export async function generatePdf(documentId: string): Promise<GeneratePdfResult> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!doc) throw new NotFoundError("Document not found");

  const businessInfo = await prisma.businessInfo.findUnique({
    where: { id: "default" },
  });

  const filename = `${doc.documentNumber.replace(/[/\\:]/g, "-")}_${Date.now()}.pdf`;

  const html = await buildPdfHtml(doc, businessInfo);
  const browser = await getPdfBrowser();
  const page = await browser.newPage();

  let buffer: Buffer;
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");
    const pdfOptions = {
      format: "A4" as const,
      printBackground: true,
      waitForFonts: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    };
    buffer = (await page.pdf(pdfOptions)) as Buffer;
  } finally {
    await page.close();
  }

  if (!isServerless) {
    const pdfDir = path.join(process.cwd(), "data", "pdfs");
    await mkdir(pdfDir, { recursive: true });
    const filePath = path.join(pdfDir, filename);
    await writeFile(filePath, buffer);
    await prisma.document.update({
      where: { id: documentId },
      data: { pdfPath: `/data/pdfs/${filename}` },
    });
  }

  return { buffer, filename };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildPdfHtml(doc: any, businessInfo: any): Promise<string> {
  const docType = doc.documentType as DocumentType;
  const title = DOCUMENT_TYPE_LABELS[docType];
  const safeTitle = escapeHtml(title);
  const taxCalculation = (businessInfo?.taxCalculation || "exclusive") as TaxCalculation;
  const roundingMethod = (businessInfo?.roundingMethod || "floor") as RoundingMethod;
  const calculated = calculateTotals(
    (doc.items as Array<Record<string, any>>).map(
      (item) =>
        ({
          sortOrder: item.sortOrder,
          date: item.date?.toISOString?.().slice(0, 10),
          productName: item.productName,
          description: item.description,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          unit: item.unit,
          taxRate: item.taxRate,
          taxCategory: item.taxCategory as TaxCategory,
          amount: item.amount,
          memo: item.memo,
        }) satisfies DocumentItemFormData
    ),
    { taxCalculation, roundingMethod }
  );

  let taxBreakdownHtml = "";
  for (const breakdown of calculated.taxBreakdown) {
    taxBreakdownHtml += `<tr><td style="padding:6px 10px;border-bottom:1px solid #333">${escapeHtml(breakdown.label)}</td><td style="text-align:right;padding:6px 10px;border-bottom:1px solid #333;white-space:nowrap;min-width:90px">税抜 ${formatCurrency(breakdown.subtotal)}<br><span style="font-size:10px">税 ${formatCurrency(breakdown.taxAmount)}</span></td></tr>`;
  }

  const cellBorder = "1px solid #333";
  const cellPad = "6px 8px";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemRows = (doc.items as any[])
    .map(
      (item) => `
    <tr>
      <td style="border:${cellBorder};padding:${cellPad};vertical-align:top">${escapeHtml(item.productName)}${item.description ? `<br><span style="font-size:9px;color:#555">${toMultilineHtml(item.description, "")}</span>` : ""}</td>
      <td style="border:${cellBorder};padding:${cellPad};text-align:right;white-space:nowrap">${formatCurrency(item.unitPrice)}</td>
      <td style="border:${cellBorder};padding:${cellPad};text-align:right">${item.quantity}</td>
      <td style="border:${cellBorder};padding:${cellPad};text-align:center">${escapeHtml(item.unit)}</td>
      <td style="border:${cellBorder};padding:${cellPad};text-align:right;white-space:nowrap">${formatCurrency(item.amount)}</td>
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
  const safeTotalLabel = escapeHtml(totalLabel);

  let extraInfo = "";
  if (docType === "estimate" && doc.validUntil) {
    extraInfo += `<div>有効期限: ${escapeHtml(formatDate(doc.validUntil))}</div>`;
  }
  if (docType === "delivery_note" && doc.deliveryDate) {
    extraInfo += `<div>納品日: ${escapeHtml(formatDate(doc.deliveryDate))}</div>`;
  }
  if (docType === "invoice" && doc.paymentDueDate) {
    extraInfo += `<div>お支払期限: ${escapeHtml(formatDate(doc.paymentDueDate))}</div>`;
  }
  if (docType === "receipt" && doc.receiptDate) {
    extraInfo += `<div>領収日: ${escapeHtml(formatDate(doc.receiptDate))}</div>`;
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
        <div style="border-bottom:1px solid #333;padding-bottom:6px;min-height:16px;white-space:pre-wrap">${toMultilineHtml(bankText)}</div>
      </div>`;
  }

  let receiptExtra = "";
  if (docType === "receipt" && doc.proviso) {
    receiptExtra += `<div style="margin-bottom:8px;font-size:10px"><strong>但し:</strong> ${escapeHtml(doc.proviso)}</div>`;
  }

  const sumTdStyle = "padding:6px 10px;border-bottom:1px solid #333;text-align:right;white-space:nowrap;min-width:90px";
  let withholdingHtml = "";
  if (doc.withholdingTax && doc.withholdingAmount > 0) {
    withholdingHtml = `<tr><td style="padding:6px 10px;border-bottom:1px solid #333;color:#c00">源泉徴収税</td><td style="${sumTdStyle};color:#c00">-${formatCurrency(doc.withholdingAmount)}</td></tr>`;
  }

  const thStyle = `border:1px solid #333;padding:6px 8px;background:#e8e8e8;font-weight:bold`;
  const sumTd = sumTdStyle;
  const fontCss = await getPdfFontCss();

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<style>
  ${fontCss}
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'${PDF_FONT_FAMILY}','Hiragino Sans','Yu Gothic','Meiryo',sans-serif; font-size:11px; color:#333; line-height:1.5; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  table { border-collapse:collapse; table-layout:fixed; }
  .item-table { width:100%; margin-bottom:16px; }
  .item-table th, .item-table td { border:1px solid #333; }
  .sum-table { width:260px; margin-left:auto; margin-bottom:16px; border:1px solid #333; }
  .sum-table td { border-bottom:1px solid #333; }
</style>
</head>
<body>
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="font-size:20px;letter-spacing:8px;font-weight:bold">${safeTitle}</h1>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:20px">
    <div style="width:48%">
      <div style="border-bottom:2px solid #333;padding-bottom:4px;margin-bottom:4px">
        <span style="font-size:14px;font-weight:bold">${escapeHtml(doc.clientDisplayName)}</span>
        ${doc.clientDepartment ? `<span style="font-size:10px;margin-left:4px">${escapeHtml(doc.clientDepartment)}</span>` : ""}
        ${doc.clientContactName ? `<span style="font-size:10px;margin-left:4px">${escapeHtml(doc.clientContactName)}</span>` : ""}
        <span style="margin-left:4px">${escapeHtml(doc.clientHonorific)}</span>
      </div>
      ${doc.clientAddress ? `<div style="font-size:10px;color:#666;white-space:pre-wrap">${toMultilineHtml(doc.clientAddress, "")}</div>` : ""}
    </div>
    <div style="width:45%;text-align:right;font-size:10px">
      <div style="font-weight:bold;font-size:12px">${escapeHtml(businessInfo?.businessName || "")}</div>
      ${businessInfo?.postalCode ? `<div>〒${escapeHtml(businessInfo.postalCode)}</div>` : ""}
      ${businessInfo?.address ? `<div style="white-space:pre-wrap">${toMultilineHtml(businessInfo.address, "")}</div>` : ""}
      ${businessInfo?.phone ? `<div>TEL: ${escapeHtml(businessInfo.phone)}</div>` : ""}
      ${businessInfo?.email ? `<div>${escapeHtml(businessInfo.email)}</div>` : ""}
      ${businessInfo?.invoiceRegistrationNo ? `<div style="margin-top:4px;font-size:9px">登録番号: ${escapeHtml(businessInfo.invoiceRegistrationNo)}</div>` : ""}
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:10px">
    <div>
      ${doc.subject ? `<div><strong>件名:</strong> ${escapeHtml(doc.subject)}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div>${safeTitle}番号: ${escapeHtml(doc.documentNumber)}</div>
      <div>発行日: ${escapeHtml(formatDate(doc.issueDate))}</div>
      ${extraInfo}
    </div>
  </div>

  <div style="border:2px solid #333;border-radius:4px;padding:10px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-weight:bold;font-size:12px">${safeTotalLabel}</span>
    <span style="font-size:18px;font-weight:bold">${formatCurrency(doc.totalAmount)}</span>
  </div>

  ${receiptExtra}

  <table class="item-table" style="width:100%">
    <colgroup>
      <col style="width:auto">
      <col style="width:72px">
      <col style="width:48px">
      <col style="width:36px">
      <col style="width:72px">
    </colgroup>
    <thead>
      <tr>
        <th style="${thStyle};text-align:left">品目</th>
        <th style="${thStyle};text-align:right">単価</th>
        <th style="${thStyle};text-align:right">数量</th>
        <th style="${thStyle};text-align:center">単位</th>
        <th style="${thStyle};text-align:right">金額</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <table class="sum-table">
    <tr><td style="padding:6px 10px;border-bottom:1px solid #333">小計</td><td style="${sumTd}">${formatCurrency(doc.subtotal)}</td></tr>
    ${taxBreakdownHtml}
    <tr><td style="padding:6px 10px;border-bottom:1px solid #333">消費税</td><td style="${sumTd}">${formatCurrency(doc.taxAmount)}</td></tr>
    ${withholdingHtml}
    <tr><td style="padding:6px 10px;font-weight:bold;border-bottom:2px solid #333">合計</td><td style="${sumTd};font-weight:bold;font-size:13px;border-bottom:2px solid #333">${formatCurrency(doc.totalAmount)}</td></tr>
  </table>

  ${bankInfo}

  <div style="margin-top:12px;font-size:10px">
    <div style="font-weight:bold;margin-bottom:4px">備考</div>
    <div style="border-bottom:1px solid #333;padding-bottom:6px;min-height:16px;white-space:pre-wrap;color:#555">${toMultilineHtml(doc.notes)}</div>
  </div>

  ${
    docType === "receipt" && doc.showStampNotice && doc.totalAmount >= 50000
      ? `<div style="margin-top:16px;padding:8px;border:1px solid #f0a020;background:#fff8e8;border-radius:4px;font-size:9px;color:#a06000">※ 金額が5万円以上の場合、収入印紙の貼付が必要な場合があります。</div>`
      : ""
  }
</body>
</html>`;
}
