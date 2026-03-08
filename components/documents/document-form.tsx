"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DocumentItemsEditor } from "./document-items-editor";
import { DocumentPreview } from "./document-preview";
import type {
  DocumentFormData,
  DocumentItemFormData,
  DocumentType,
  RoundingMethod,
  TaxCalculation,
  TaxCategory,
} from "@/types/document";
import {
  ACCOUNT_TYPE_LABELS,
  AccountType,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  calculateTotals,
  calculateWithholdingTax,
  CONVERSION_MAP,
} from "@/types/document";
import { todayDateOnly } from "@/lib/utils";
import {
  Save,
  FileDown,
  Copy,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  department: string;
  contactPerson: string;
  honorific: string;
  postalCode: string;
  address: string;
  paymentTerms: string;
  defaultSubject: string;
  defaultNotes: string;
  bankAccountId?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  unit: string;
  taxRate: number;
  defaultQuantity: number;
}

interface BankAccount {
  id: string;
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  displayText: string;
  isDefault: boolean;
}

interface BusinessInfo {
  businessName: string;
  representativeName: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  invoiceRegistrationNo: string;
  logoPath: string;
  sealPath: string;
  defaultHonorific: string;
  defaultNotes: string;
  defaultPaymentTerms: string;
  defaultBankAccountId?: string;
  taxCalculation: string;
  roundingMethod: string;
}

type AutoSaveState = "idle" | "pending" | "saving" | "saved" | "error";

interface DocumentFormProps {
  documentType: DocumentType;
  documentId?: string;
  initialData?: DocumentFormData;
  mode: "create" | "edit";
}

function getDefaultFormData(type: DocumentType): DocumentFormData {
  return {
    documentType: type,
    documentNumber: "",
    status: "draft",
    issueDate: todayDateOnly(),
    clientDisplayName: "",
    clientDepartment: "",
    clientContactName: "",
    clientHonorific: "",
    clientAddress: "",
    subject: "",
    notes: "",
    internalMemo: "",
    tags: "",
    items: [
      {
        sortOrder: 0,
        productName: "",
        description: "",
        unitPrice: 0,
        quantity: 1,
        unit: "",
        taxRate: 10,
        taxCategory: "taxable_10" as TaxCategory,
        amount: 0,
        memo: "",
      },
    ],
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
  };
}

function getBankAccountLabel(account: BankAccount | null | undefined) {
  if (!account) {
    return "";
  }

  if (account.displayText) {
    return account.displayText;
  }

  return [
    account.bankName,
    account.branchName,
    ACCOUNT_TYPE_LABELS[account.accountType as AccountType] || account.accountType,
    account.accountNumber,
    account.accountHolder,
  ]
    .filter(Boolean)
    .join(" ");
}

function joinNoteLines(...parts: Array<string | undefined>) {
  return Array.from(
    new Set(parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part)))
  ).join("\n");
}

function getCalculationOptions(businessInfo: BusinessInfo | null) {
  return {
    roundingMethod: (businessInfo?.roundingMethod || "floor") as RoundingMethod,
    taxCalculation: (businessInfo?.taxCalculation || "exclusive") as TaxCalculation,
  };
}

function getAutoSaveLabel(state: AutoSaveState, lastSaved: string) {
  if (state === "saving") {
    return "自動保存中...";
  }
  if (state === "pending") {
    return "変更あり";
  }
  if (state === "error") {
    return "自動保存に失敗";
  }
  if (state === "saved" && lastSaved) {
    return `自動保存: ${lastSaved}`;
  }
  return "";
}

export function DocumentForm({
  documentType,
  documentId,
  initialData,
  mode,
}: DocumentFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<DocumentFormData>(
    initialData || getDefaultFormData(documentType)
  );
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveInitialized = useRef(false);
  const [lastSaved, setLastSaved] = useState<string>("");
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("idle");

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/bank-accounts").then((r) => r.json()),
      fetch("/api/settings/business").then((r) => r.json()),
    ]).then(([c, p, b, bi]) => {
      setClients(c);
      setProducts(p);
      setBankAccounts(b);
      setBusinessInfo(bi);

      if (mode === "create" && !initialData) {
        const defaultBankAccount = b.find((account: BankAccount) => account.id === bi.defaultBankAccountId);
        setFormData((prev) => ({
          ...prev,
          clientHonorific: bi.defaultHonorific || prev.clientHonorific || "御中",
          notes: prev.notes || bi.defaultNotes || "",
          bankAccountId:
            documentType === "invoice"
              ? prev.bankAccountId || bi.defaultBankAccountId || undefined
              : prev.bankAccountId,
          bankAccountText:
            documentType === "invoice"
              ? prev.bankAccountText || getBankAccountLabel(defaultBankAccount)
              : prev.bankAccountText,
        }));
      }
    });
  }, [documentType, mode, initialData]);

  const recalculate = useCallback(
    (items: DocumentItemFormData[]) => {
      const { subtotal, taxAmount, totalAmount } = calculateTotals(
        items.filter((i) => i.productName),
        getCalculationOptions(businessInfo)
      );

      let finalTotal = totalAmount;
      let withholdingAmount = formData.withholdingAmount || 0;
      if (formData.withholdingTax) {
        withholdingAmount = calculateWithholdingTax(subtotal);
        finalTotal = totalAmount - withholdingAmount;
      }

      setFormData((prev) => ({
        ...prev,
        items,
        subtotal,
        taxAmount,
        totalAmount: finalTotal,
        withholdingAmount,
      }));
    },
    [businessInfo, formData.withholdingTax, formData.withholdingAmount]
  );

  const updateField = useCallback(
    (field: keyof DocumentFormData, value: unknown) => {
      setFormData((prev) => {
        const next = { ...prev, [field]: value };

        if (field === "withholdingTax") {
          const { subtotal, totalAmount } = calculateTotals(
            prev.items.filter((i) => i.productName),
            getCalculationOptions(businessInfo)
          );
          if (value) {
            next.withholdingAmount = calculateWithholdingTax(subtotal);
            next.totalAmount = totalAmount - next.withholdingAmount;
          } else {
            next.withholdingAmount = 0;
            next.totalAmount = totalAmount;
          }
        }

        return next;
      });
    },
    [businessInfo]
  );

  const selectClient = useCallback(
    (clientId: string) => {
      const client = clients.find((c) => c.id === clientId);
      if (!client) return;
      const selectedBankAccountId =
        documentType === "invoice"
          ? client.bankAccountId || businessInfo?.defaultBankAccountId || undefined
          : undefined;
      const selectedBankAccount = bankAccounts.find((account) => account.id === selectedBankAccountId);
      const notes = joinNoteLines(
        client.defaultNotes,
        documentType === "invoice"
          ? client.paymentTerms || businessInfo?.defaultPaymentTerms
          : undefined,
        businessInfo?.defaultNotes
      );

      setFormData((prev) => ({
        ...prev,
        clientId,
        clientDisplayName: client.name,
        clientDepartment: client.department,
        clientContactName: client.contactPerson,
        clientHonorific: client.honorific || businessInfo?.defaultHonorific || prev.clientHonorific || "御中",
        clientAddress: client.address
          ? `〒${client.postalCode} ${client.address}`
          : "",
        subject: prev.subject || client.defaultSubject || "",
        notes: prev.notes || notes,
        bankAccountId:
          documentType === "invoice" ? selectedBankAccountId || prev.bankAccountId : prev.bankAccountId,
        bankAccountText:
          documentType === "invoice"
            ? getBankAccountLabel(selectedBankAccount) || prev.bankAccountText
            : prev.bankAccountText,
      }));
    },
    [bankAccounts, businessInfo, clients, documentType]
  );

  const selectBankAccount = useCallback(
    (accountId: string) => {
      const account = bankAccounts.find((a) => a.id === accountId);
      if (!account) return;
      setFormData((prev) => ({
        ...prev,
        bankAccountId: accountId,
        bankAccountText: getBankAccountLabel(account),
      }));
    },
    [bankAccounts]
  );

  // Auto-save (only in edit mode)
  useEffect(() => {
    if (mode !== "edit" || !documentId) return;
    if (!autoSaveInitialized.current) {
      autoSaveInitialized.current = true;
      return;
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveState("pending");
    autoSaveTimer.current = setTimeout(async () => {
      try {
        setAutoSaveState("saving");
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          throw new Error("autosave_failed");
        }
        setLastSaved(new Date().toLocaleTimeString("ja-JP"));
        setAutoSaveState("saved");
      } catch {
        setAutoSaveState("error");
      }
    }, 3000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [formData, mode, documentId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error("保存失敗: " + JSON.stringify(err.error));
          return;
        }
        const doc = await res.json();
        toast.success("保存しました");
        const paths: Record<string, string> = {
          estimate: "/estimates",
          delivery_note: "/delivery-notes",
          invoice: "/invoices",
          receipt: "/receipts",
        };
        router.push(`${paths[documentType]}/${doc.id}/edit`);
      } else {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error("保存失敗: " + JSON.stringify(err.error));
          return;
        }
        toast.success("保存しました");
        setLastSaved(new Date().toLocaleTimeString("ja-JP"));
        setAutoSaveState("saved");
      }
    } catch (e) {
      toast.error("エラーが発生しました");
      setAutoSaveState("error");
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!documentId) {
      toast.error("先に保存してください");
      return;
    }
    setGeneratingPdf(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/pdf`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("PDF生成に失敗しました");
        return;
      }
      const data = await res.json();
      toast.success("PDFを生成しました");
      window.open(data.url, "_blank");
    } catch {
      toast.error("PDF生成エラー");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDuplicate = async () => {
    if (!documentId) return;
    try {
      const res = await fetch(`/api/documents/${documentId}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("duplicate_failed");
      }
      const doc = await res.json();
      const paths: Record<string, string> = {
        estimate: "/estimates",
        delivery_note: "/delivery-notes",
        invoice: "/invoices",
        receipt: "/receipts",
      };
      toast.success("複製しました");
      router.push(`${paths[doc.documentType]}/${doc.id}/edit`);
    } catch {
      toast.error("複製に失敗しました");
    }
  };

  const handleConvert = async (targetType: DocumentType) => {
    if (!documentId) return;
    try {
      const res = await fetch(`/api/documents/${documentId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType }),
      });
      if (!res.ok) {
        throw new Error("convert_failed");
      }
      const doc = await res.json();
      const paths: Record<string, string> = {
        estimate: "/estimates",
        delivery_note: "/delivery-notes",
        invoice: "/invoices",
        receipt: "/receipts",
      };
      toast.success(`${DOCUMENT_TYPE_LABELS[targetType]}に変換しました`);
      router.push(`${paths[targetType]}/${doc.id}/edit`);
    } catch {
      toast.error("変換に失敗しました");
    }
  };

  const conversionTargets = CONVERSION_MAP[documentType] || [];

  return (
    <div className="flex gap-5 h-[calc(100vh-9rem)]">
      {/* Left: Form */}
      <div className="w-1/2 overflow-y-auto space-y-5 pb-8">
        {/* Action Bar - MF style */}
        <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-2 border-b border-[#e0e3e7] bg-white px-5 py-2.5 flex flex-wrap items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            保存
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePdf}
            disabled={generatingPdf || !documentId}
            className="gap-1"
          >
            {generatingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            PDF発行
          </Button>
          {documentId && (
            <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-1">
              <Copy className="h-3.5 w-3.5" />
              複製
            </Button>
          )}
          {documentId &&
            conversionTargets.map((target) => (
              <Button
                key={target}
                variant="outline"
                size="sm"
                onClick={() => handleConvert(target)}
                className="gap-1"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                {DOCUMENT_TYPE_LABELS[target]}へ変換
              </Button>
            ))}
          {getAutoSaveLabel(autoSaveState, lastSaved) && (
            <span className="text-[11px] text-[#8a8a8a] ml-auto">
              {getAutoSaveLabel(autoSaveState, lastSaved)}
            </span>
          )}
        </div>

        {/* Basic Info */}
        <div className="space-y-3 rounded bg-white border border-[#e0e3e7] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h3 className="text-[13px] font-bold text-[#333] mb-2">基本情報</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>書類番号</Label>
              <Input
                value={formData.documentNumber}
                onChange={(e) => updateField("documentNumber", e.target.value)}
                placeholder={mode === "create" ? "未入力なら保存時に自動採番" : ""}
              />
            </div>
            <div className="space-y-1">
              <Label>ステータス</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => updateField("status", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>発行日 <span className="text-[#e74c3c]">*</span></Label>
              <Input
                type="date"
                value={formData.issueDate}
                onChange={(e) => updateField("issueDate", e.target.value)}
              />
            </div>
            {documentType === "estimate" && (
              <div className="space-y-1">
                <Label>有効期限 <span className="text-[#e74c3c]">*</span></Label>
                <Input
                  type="date"
                  value={formData.validUntil || ""}
                  onChange={(e) => updateField("validUntil", e.target.value)}
                />
              </div>
            )}
            {documentType === "delivery_note" && (
              <div className="space-y-1">
                <Label>納品日 <span className="text-[#e74c3c]">*</span></Label>
                <Input
                  type="date"
                  value={formData.deliveryDate || ""}
                  onChange={(e) => updateField("deliveryDate", e.target.value)}
                />
              </div>
            )}
            {documentType === "invoice" && (
              <div className="space-y-1">
                <Label>支払期限 <span className="text-[#e74c3c]">*</span></Label>
                <Input
                  type="date"
                  value={formData.paymentDueDate || ""}
                  onChange={(e) => updateField("paymentDueDate", e.target.value)}
                />
              </div>
            )}
            {documentType === "receipt" && (
              <div className="space-y-1">
                <Label>領収日</Label>
                <Input
                  type="date"
                  value={formData.receiptDate || ""}
                  onChange={(e) => updateField("receiptDate", e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Client Info */}
        <div className="space-y-3 rounded bg-white border border-[#e0e3e7] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h3 className="text-[13px] font-bold text-[#333] mb-2">取引先</h3>
          <div className="space-y-1">
            <Label>取引先選択</Label>
            <Select
              value={formData.clientId || ""}
              onValueChange={selectClient}
            >
              <SelectTrigger>
                <SelectValue placeholder="取引先を選択" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>取引先名 <span className="text-[#e74c3c]">*</span></Label>
              <Input
                value={formData.clientDisplayName}
                onChange={(e) => updateField("clientDisplayName", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>敬称</Label>
              <Select
                value={formData.clientHonorific}
                onValueChange={(val) => updateField("clientHonorific", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="御中">御中</SelectItem>
                  <SelectItem value="様">様</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>部署名</Label>
              <Input
                value={formData.clientDepartment}
                onChange={(e) => updateField("clientDepartment", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>担当者名</Label>
              <Input
                value={formData.clientContactName}
                onChange={(e) => updateField("clientContactName", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>住所</Label>
            <Input
              value={formData.clientAddress}
              onChange={(e) => updateField("clientAddress", e.target.value)}
            />
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1 rounded bg-white border border-[#e0e3e7] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <Label>件名 <span className="text-[#e74c3c]">*</span></Label>
          <Input
            value={formData.subject}
            onChange={(e) => updateField("subject", e.target.value)}
            placeholder="例: Webサイト制作"
          />
        </div>

        {/* Items */}
        <div className="rounded bg-white border border-[#e0e3e7] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h3 className="text-[13px] font-bold text-[#333] mb-3">明細</h3>
          <DocumentItemsEditor
            items={formData.items}
            onChange={recalculate}
            products={products}
          />
        </div>

        {/* Invoice specific */}
        {documentType === "invoice" && (
          <div className="space-y-3 rounded bg-white border border-[#e0e3e7] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <h3 className="text-[13px] font-bold text-[#333] mb-2">請求書設定</h3>
              <div className="space-y-1">
                <Label>振込先</Label>
                <Select
                  value={formData.bankAccountId || ""}
                  onValueChange={selectBankAccount}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="振込先を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.displayText || `${a.bankName} ${a.branchName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.withholdingTax || false}
                  onCheckedChange={(checked) => updateField("withholdingTax", checked)}
                />
                <Label>源泉徴収を適用</Label>
                {formData.withholdingTax && formData.withholdingAmount && (
                  <span className="text-[12px] text-[#8a8a8a]">
                    ({new Intl.NumberFormat("ja-JP").format(formData.withholdingAmount)}円)
                  </span>
                )}
              </div>
          </div>
        )}

        {/* Receipt specific */}
        {documentType === "receipt" && (
          <div className="space-y-3 rounded bg-white border border-[#e0e3e7] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <h3 className="text-[13px] font-bold text-[#333] mb-2">領収書設定</h3>
              <div className="space-y-1">
                <Label>宛名</Label>
                <Input
                  value={formData.addressee || ""}
                  onChange={(e) => updateField("addressee", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>但し書き <span className="text-[#e74c3c]">*</span></Label>
                <Input
                  value={formData.proviso || ""}
                  onChange={(e) => updateField("proviso", e.target.value)}
                  placeholder="例: お品代として"
                />
              </div>
              <div className="space-y-1">
                <Label>支払方法</Label>
                <Select
                  value={formData.paymentMethod || ""}
                  onValueChange={(val) => updateField("paymentMethod", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.isReissue || false}
                  onCheckedChange={(checked) => updateField("isReissue", checked)}
                />
                <Label>再発行</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.showStampNotice || false}
                  onCheckedChange={(checked) => updateField("showStampNotice", checked)}
                />
                <Label>収入印紙注意文を表示</Label>
              </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-3 rounded bg-white border border-[#e0e3e7] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h3 className="text-[13px] font-bold text-[#333] mb-2">備考・メモ</h3>
          <div className="space-y-1">
            <Label>備考</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <Label>内部メモ（PDFには出力されません）</Label>
            <Textarea
              value={formData.internalMemo}
              onChange={(e) => updateField("internalMemo", e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label>タグ（カンマ区切り）</Label>
            <Input
              value={formData.tags}
              onChange={(e) => updateField("tags", e.target.value)}
              placeholder="例: 重要,デザイン"
            />
          </div>
        </div>
      </div>

      {/* Right: Preview */}
      <div className="w-1/2 overflow-y-auto bg-[#e8eaed] rounded p-4 flex justify-center">
        <DocumentPreview
          data={formData}
          businessInfo={businessInfo || undefined}
          bankAccount={formData.bankAccountId ? bankAccounts.find((a) => a.id === formData.bankAccountId) || null : null}
        />
      </div>
    </div>
  );
}
