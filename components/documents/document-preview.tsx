"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  DocumentFormData,
  TaxBreakdown,
  DocumentType,
} from "@/types/document";
import { DOCUMENT_TYPE_LABELS, calculateTotals, ACCOUNT_TYPE_LABELS, AccountType } from "@/types/document";

interface DocumentPreviewProps {
  data: Partial<DocumentFormData>;
  businessInfo?: {
    businessName: string;
    representativeName: string;
    postalCode: string;
    address: string;
    phone: string;
    email: string;
    invoiceRegistrationNo: string;
    logoPath: string;
    sealPath: string;
  };
  bankAccount?: {
    bankName: string;
    branchName: string;
    accountType: string;
    accountNumber: string;
    accountHolder: string;
  } | null;
}

export function DocumentPreview({ data, businessInfo, bankAccount }: DocumentPreviewProps) {
  const docType = data.documentType || "estimate";
  const title = DOCUMENT_TYPE_LABELS[docType];
  const items = data.items || [];
  const { subtotal, taxAmount, totalAmount, taxBreakdown } = calculateTotals(
    items.filter((i) => i.productName),
    "floor"
  );

  const totalDisplay = data.totalAmount || totalAmount;

  const bankText = bankAccount
    ? `${bankAccount.bankName} ${bankAccount.branchName} ${ACCOUNT_TYPE_LABELS[bankAccount.accountType as AccountType] || bankAccount.accountType} ${bankAccount.accountNumber} ${bankAccount.accountHolder}`
    : data.bankAccountText || "";

  return (
    <div className="bg-white border rounded shadow-sm p-8 text-[11px] leading-relaxed" style={{ width: "100%", maxWidth: "595px", minHeight: "842px", aspectRatio: "1/1.414" }}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold tracking-widest">{title}</h2>
      </div>

      {/* Client and Business Info */}
      <div className="flex justify-between mb-6">
        {/* Left - Client */}
        <div className="w-[48%]">
          <div className="border-b-2 border-gray-800 pb-1 mb-2">
            <span className="text-sm font-bold">
              {data.clientDisplayName || "取引先名"}
            </span>
            {data.clientDepartment && (
              <span className="ml-1 text-[10px]">{data.clientDepartment}</span>
            )}
            {data.clientContactName && (
              <span className="ml-1 text-[10px]">{data.clientContactName}</span>
            )}
            <span className="ml-1">{data.clientHonorific || "御中"}</span>
          </div>
          {data.clientAddress && (
            <div className="text-[10px] text-gray-600">{data.clientAddress}</div>
          )}
        </div>

        {/* Right - Business */}
        <div className="w-[45%] text-right text-[10px]">
          {businessInfo?.logoPath && (
            <div className="mb-1">
              <img src={businessInfo.logoPath} alt="ロゴ" className="h-8 ml-auto" />
            </div>
          )}
          <div className="font-bold text-xs">{businessInfo?.businessName || "未設定"}</div>
          {businessInfo?.postalCode && <div>〒{businessInfo.postalCode}</div>}
          {businessInfo?.address && <div>{businessInfo.address}</div>}
          {businessInfo?.phone && <div>TEL: {businessInfo.phone}</div>}
          {businessInfo?.email && <div>{businessInfo.email}</div>}
          {businessInfo?.invoiceRegistrationNo && (
            <div className="mt-1 text-[9px]">
              登録番号: {businessInfo.invoiceRegistrationNo}
            </div>
          )}
          {businessInfo?.sealPath && (
            <div className="mt-1 flex justify-end">
              <img src={businessInfo.sealPath} alt="印影" className="h-12 w-12 object-contain" />
            </div>
          )}
        </div>
      </div>

      {/* Document Info */}
      <div className="flex justify-between mb-4 text-[10px]">
        <div>
          {data.subject && (
            <div className="mb-1">
              <span className="font-bold">件名: </span>
              {data.subject}
            </div>
          )}
        </div>
        <div className="text-right space-y-0.5">
          <div>
            {title}番号: {data.documentNumber || "-"}
          </div>
          <div>
            {docType === "invoice" ? "請求日" : "発行日"}:{" "}
            {data.issueDate ? formatDate(data.issueDate) : "-"}
          </div>
          {docType === "estimate" && data.validUntil && (
            <div>有効期限: {formatDate(data.validUntil)}</div>
          )}
          {docType === "delivery_note" && data.deliveryDate && (
            <div>納品日: {formatDate(data.deliveryDate)}</div>
          )}
          {docType === "invoice" && data.paymentDueDate && (
            <div>お支払期限: {formatDate(data.paymentDueDate)}</div>
          )}
          {docType === "receipt" && data.receiptDate && (
            <div>領収日: {formatDate(data.receiptDate)}</div>
          )}
        </div>
      </div>

      {/* Total Amount */}
      <div className="border-2 border-gray-800 rounded px-4 py-2 mb-4 flex justify-between items-center">
        <span className="font-bold text-xs">
          {docType === "estimate"
            ? "御見積金額"
            : docType === "invoice"
              ? "ご請求金額"
              : docType === "receipt"
                ? "領収金額"
                : "合計金額"}
        </span>
        <span className="text-lg font-bold">
          {formatCurrency(totalDisplay)}
        </span>
      </div>

      {/* Receipt specifics */}
      {docType === "receipt" && data.proviso && (
        <div className="mb-3 text-[10px]">
          <span className="font-bold">但し: </span>
          {data.proviso}
        </div>
      )}

      {/* Items Table */}
      <table className="w-full mb-3 border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-400">
            {docType === "delivery_note" && (
              <th className="px-1 py-1 text-left text-[10px] font-bold text-gray-700 w-16">納品日</th>
            )}
            <th className="px-1 py-1 text-left text-[10px] font-bold text-gray-700">品目・納品書番号</th>
            <th className="px-1 py-1 text-right text-[10px] font-bold text-gray-700 w-16">単価</th>
            <th className="px-1 py-1 text-right text-[10px] font-bold text-gray-700 w-10">数量</th>
            <th className="px-1 py-1 text-center text-[10px] font-bold text-gray-700 w-8">単位</th>
            <th className="px-1 py-1 text-right text-[10px] font-bold text-gray-700 w-16">価格</th>
          </tr>
        </thead>
        <tbody>
          {items.filter((i) => i.productName).length === 0 ? (
            <tr>
              <td colSpan={docType === "delivery_note" ? 6 : 5} className="px-1 py-6 text-center text-gray-400 border-b border-gray-200">
                明細行を追加してください
              </td>
            </tr>
          ) : (
            items
              .filter((i) => i.productName)
              .map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  {docType === "delivery_note" && (
                    <td className="px-1 py-1 text-[10px]">{item.date ? formatDate(item.date) : ""}</td>
                  )}
                  <td className="px-1 py-1">
                    <div>{item.productName}</div>
                    {item.description && (
                      <div className="text-[9px] text-gray-500">{item.description}</div>
                    )}
                  </td>
                  <td className="px-1 py-1 text-right">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-1 py-1 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-1 py-1 text-center">
                    {item.unit}
                  </td>
                  <td className="px-1 py-1 text-right">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </td>
                </tr>
              ))
          )}
        </tbody>
      </table>

      {/* Summary + Tax breakdown side by side */}
      <div className="flex justify-between mb-4">
        {/* Tax breakdown (left) */}
        <div className="text-[9px]">
          <div className="font-bold text-[10px] mb-1">税率別内訳</div>
          <table className="border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="pr-3 py-0.5 text-left font-normal text-gray-500"></th>
                <th className="pr-3 py-0.5 text-right font-normal text-gray-500">税抜金額</th>
                <th className="pr-3 py-0.5 text-right font-normal text-gray-500">消費税額</th>
                <th className="py-0.5 text-right font-normal text-gray-500">税込金額</th>
              </tr>
            </thead>
            <tbody>
              {taxBreakdown.length > 0 ? taxBreakdown.map((tb: TaxBreakdown, idx: number) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="pr-3 py-0.5">{tb.label}</td>
                  <td className="pr-3 py-0.5 text-right">{formatCurrency(tb.subtotal)}</td>
                  <td className="pr-3 py-0.5 text-right">{formatCurrency(tb.taxAmount)}</td>
                  <td className="py-0.5 text-right">{formatCurrency(tb.subtotal + tb.taxAmount)}</td>
                </tr>
              )) : (
                <tr className="border-b border-gray-200">
                  <td className="pr-3 py-0.5">10%</td>
                  <td className="pr-3 py-0.5 text-right">0</td>
                  <td className="pr-3 py-0.5 text-right">0</td>
                  <td className="py-0.5 text-right">0</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals (right) */}
        <div className="w-44">
          <div className="flex justify-between py-1 border-b border-gray-300">
            <span className="text-[10px] text-gray-600">小計</span>
            <span className="text-[10px] font-medium">{formatCurrency(data.subtotal || subtotal)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-300">
            <span className="text-[10px] text-gray-600">消費税額合計</span>
            <span className="text-[10px] font-medium">{formatCurrency(data.taxAmount || taxAmount)}</span>
          </div>
          {data.withholdingTax && data.withholdingAmount && data.withholdingAmount > 0 && (
            <div className="flex justify-between py-1 border-b border-gray-300 text-red-600">
              <span className="text-[10px]">源泉徴収税</span>
              <span className="text-[10px] font-medium">-{formatCurrency(data.withholdingAmount)}</span>
            </div>
          )}
          <div className="flex justify-between py-1.5 border-b-2 border-gray-800">
            <span className="text-[10px] font-bold">合計</span>
            <span className="text-[11px] font-bold">{formatCurrency(totalDisplay)}</span>
          </div>
        </div>
      </div>

      {/* Bank Account for Invoice */}
      {docType === "invoice" && (
        <div className="mb-3">
          <div className="text-[10px] font-bold mb-1">振込先</div>
          <div className="border-b border-gray-800 pb-2 min-h-[20px]">
            {bankText ? (
              <div className="text-[10px]">{bankText}</div>
            ) : (
              <div className="text-[10px] text-gray-400">振込先を選択してください</div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="mb-3">
        <div className="text-[10px] font-bold mb-1">備考</div>
        <div className="border-b border-gray-800 pb-2 min-h-[20px]">
          {data.notes ? (
            <div className="whitespace-pre-wrap text-[10px] text-gray-700">{data.notes}</div>
          ) : (
            <div className="text-[10px] text-gray-400">&nbsp;</div>
          )}
        </div>
      </div>

      {/* Stamp notice for receipts */}
      {docType === "receipt" && data.showStampNotice && totalDisplay >= 50000 && (
        <div className="mt-3 p-2 border border-orange-300 bg-orange-50 rounded text-[9px] text-orange-700">
          ※ 金額が5万円以上の場合、収入印紙の貼付が必要な場合があります。
        </div>
      )}
    </div>
  );
}
