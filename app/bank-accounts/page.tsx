"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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

const emptyAccount = {
  bankName: "",
  branchName: "",
  accountType: "ordinary",
  accountNumber: "",
  accountHolder: "",
  displayText: "",
  isDefault: false,
};

const accountTypeLabels: Record<string, string> = {
  ordinary: "普通",
  checking: "当座",
  savings: "貯蓄",
};

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyAccount);
  const [saving, setSaving] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/bank-accounts");
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          typeof data?.message === "string"
            ? data.message
            : "振込先の取得に失敗しました";
        setAccounts([]);
        toast.error(message);
        return;
      }

      if (!Array.isArray(data)) {
        setAccounts([]);
        toast.error("振込先データの形式が不正です");
        return;
      }

      setAccounts(data);
    } catch {
      setAccounts([]);
      toast.error("振込先の取得に失敗しました");
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleSave = async () => {
    const bankName = form.bankName?.trim() ?? "";
    if (!bankName) {
      toast.error("銀行名を入力してください");
      return;
    }
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/bank-accounts/${editingId}` : "/api/bank-accounts";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.formErrors?.[0] ?? data?.error?.fieldErrors?.bankName?.[0] ?? data?.message ?? "保存に失敗しました";
        toast.error(typeof msg === "string" ? msg : "保存に失敗しました");
        return;
      }
      toast.success(editingId ? "更新しました" : "作成しました");
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyAccount);
      fetchAccounts();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (account: BankAccount) => {
    setEditingId(account.id);
    setForm({
      bankName: account.bankName,
      branchName: account.branchName,
      accountType: account.accountType,
      accountNumber: account.accountNumber,
      accountHolder: account.accountHolder,
      displayText: account.displayText,
      isDefault: account.isDefault,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この振込先を削除しますか？")) return;
    await fetch(`/api/bank-accounts/${id}`, { method: "DELETE" });
    toast.success("削除しました");
    fetchAccounts();
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyAccount);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={openNew} className="gap-1 ml-auto">
          <Plus className="h-4 w-4" />
          振込先を追加
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>銀行名</TableHead>
              <TableHead>支店名</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>口座番号</TableHead>
              <TableHead>口座名義</TableHead>
              <TableHead>デフォルト</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  振込先がありません
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.bankName}</TableCell>
                  <TableCell>{a.branchName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{accountTypeLabels[a.accountType] ?? a.accountType}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{a.accountNumber}</TableCell>
                  <TableCell className="text-sm">{a.accountHolder}</TableCell>
                  <TableCell>
                    {a.isDefault && <Badge variant="secondary">デフォルト</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(a.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "振込先を編集" : "振込先を追加"}</DialogTitle>
            <DialogDescription>振込先の情報を入力してください。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>銀行名 *</Label>
              <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>支店名</Label>
              <Input value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>口座種別</Label>
              <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordinary">普通</SelectItem>
                  <SelectItem value="checking">当座</SelectItem>
                  <SelectItem value="savings">貯蓄</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>口座番号</Label>
              <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>口座名義</Label>
              <Input value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>表示用テキスト</Label>
              <Input value={form.displayText} onChange={(e) => setForm({ ...form, displayText: e.target.value })} placeholder="請求書等に表示するテキスト" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isDefault"
                checked={form.isDefault}
                onCheckedChange={(checked) => setForm({ ...form, isDefault: checked })}
              />
              <Label htmlFor="isDefault">デフォルト振込先にする</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "保存中…" : editingId ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
