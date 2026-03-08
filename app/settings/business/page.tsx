"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface BankAccount {
  id: string;
  displayText: string;
  bankName: string;
  branchName: string;
}

interface BusinessSettings {
  businessName: string;
  tradeName: string;
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
  taxCalculation: string;
  roundingMethod: string;
  defaultPaymentTerms: string;
  defaultBankAccountId?: string;
}

const emptySettings: BusinessSettings = {
  businessName: "",
  tradeName: "",
  representativeName: "",
  postalCode: "",
  address: "",
  phone: "",
  email: "",
  invoiceRegistrationNo: "",
  logoPath: "",
  sealPath: "",
  defaultHonorific: "御中",
  defaultNotes: "",
  taxCalculation: "exclusive",
  roundingMethod: "floor",
  defaultPaymentTerms: "",
  defaultBankAccountId: undefined,
};

export default function BusinessSettingsPage() {
  const [form, setForm] = useState<BusinessSettings>(emptySettings);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "seal" | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/business").then((res) => res.json()),
      fetch("/api/bank-accounts").then((res) => res.json()),
    ])
      .then(([data, accounts]) => {
        setBankAccounts(accounts);
        setForm({
          businessName: data.businessName ?? "",
          tradeName: data.tradeName ?? "",
          representativeName: data.representativeName ?? "",
          postalCode: data.postalCode ?? "",
          address: data.address ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          invoiceRegistrationNo: data.invoiceRegistrationNo ?? "",
          logoPath: data.logoPath ?? "",
          sealPath: data.sealPath ?? "",
          defaultHonorific: data.defaultHonorific ?? "御中",
          defaultNotes: data.defaultNotes ?? "",
          taxCalculation: data.taxCalculation ?? "exclusive",
          roundingMethod: data.roundingMethod ?? "floor",
          defaultPaymentTerms: data.defaultPaymentTerms ?? "",
          defaultBankAccountId: data.defaultBankAccountId ?? undefined,
        });
      })
      .catch(() => toast.error("設定の読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (type: "logo" | "seal", file?: File) => {
    if (!file) return;
    setUploading(type);
    try {
      const body = new FormData();
      body.append("type", type);
      body.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body,
      });
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "アップロードに失敗しました");
        return;
      }
      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        logoPath: type === "logo" ? data.path : prev.logoPath,
        sealPath: type === "seal" ? data.path : prev.sealPath,
      }));
      toast.success(type === "logo" ? "ロゴをアップロードしました" : "印影をアップロードしました");
    } catch {
      toast.error("アップロードに失敗しました");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error("保存失敗: " + JSON.stringify(err.error));
        return;
      }
      toast.success("保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-[13px] text-[#8a8a8a]">読み込み中...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>事業者情報</CardTitle>
          <CardDescription>請求書・領収書等に表示される発行者情報です。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>会社名・屋号</Label>
              <Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>屋号（別名）</Label>
              <Input value={form.tradeName} onChange={(e) => setForm({ ...form, tradeName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>代表者名</Label>
            <Input value={form.representativeName} onChange={(e) => setForm({ ...form, representativeName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>郵便番号</Label>
            <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="000-0000" />
          </div>
          <div className="space-y-1.5">
            <Label>住所</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>電話番号</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>メールアドレス</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>適格請求書発行事業者登録番号</Label>
            <Input value={form.invoiceRegistrationNo} onChange={(e) => setForm({ ...form, invoiceRegistrationNo: e.target.value })} placeholder="T1234567890123" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>ロゴ画像</Label>
              <Input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" onChange={(e) => handleUpload("logo", e.target.files?.[0])} disabled={uploading === "logo"} />
              {form.logoPath && <img src={form.logoPath} alt="ロゴ" className="h-12 object-contain border rounded p-2" />}
            </div>
            <div className="space-y-1.5">
              <Label>印影画像</Label>
              <Input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" onChange={(e) => handleUpload("seal", e.target.files?.[0])} disabled={uploading === "seal"} />
              {form.sealPath && <img src={form.sealPath} alt="印影" className="h-16 object-contain border rounded p-2" />}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>デフォルト設定</CardTitle>
          <CardDescription>書類作成時の初期値です。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>デフォルト敬称</Label>
            <Select value={form.defaultHonorific} onValueChange={(v) => setForm({ ...form, defaultHonorific: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="御中">御中</SelectItem>
                <SelectItem value="様">様</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>デフォルト備考</Label>
            <Textarea value={form.defaultNotes} onChange={(e) => setForm({ ...form, defaultNotes: e.target.value })} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>デフォルト支払条件</Label>
            <Input value={form.defaultPaymentTerms} onChange={(e) => setForm({ ...form, defaultPaymentTerms: e.target.value })} placeholder="月末締め翌月末払い" />
          </div>
          <div className="space-y-1.5">
            <Label>既定の振込先</Label>
            <Select
              value={form.defaultBankAccountId || "__none__"}
              onValueChange={(value) =>
                setForm({ ...form, defaultBankAccountId: value === "__none__" ? undefined : value })
              }
            >
              <SelectTrigger><SelectValue placeholder="選択しない" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">未設定</SelectItem>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.displayText || `${account.bankName} ${account.branchName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>税計算</CardTitle>
          <CardDescription>税額の計算方法と端数処理を設定します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>税計算方式</Label>
            <Select value={form.taxCalculation} onValueChange={(v) => setForm({ ...form, taxCalculation: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exclusive">外税</SelectItem>
                <SelectItem value="inclusive">内税</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>端数処理</Label>
            <Select value={form.roundingMethod} onValueChange={(v) => setForm({ ...form, roundingMethod: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="floor">切り捨て</SelectItem>
                <SelectItem value="ceil">切り上げ</SelectItem>
                <SelectItem value="round">四捨五入</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "保存中..." : "保存"}
      </Button>
    </div>
  );
}
