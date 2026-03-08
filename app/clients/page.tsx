"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, Search } from "lucide-react";

interface Client {
  id: string;
  name: string;
  clientType: string;
  department: string;
  contactPerson: string;
  honorific: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  paymentTerms: string;
  defaultSubject: string;
  defaultNotes: string;
  tags: string;
}

const emptyClient = {
  name: "",
  clientType: "corporate",
  department: "",
  contactPerson: "",
  honorific: "御中",
  postalCode: "",
  address: "",
  phone: "",
  email: "",
  paymentTerms: "",
  defaultSubject: "",
  defaultNotes: "",
  tags: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyClient);

  const fetchClients = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/clients?${params}`);
    setClients(await res.json());
  }, [search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleSave = async () => {
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/clients/${editingId}` : "/api/clients";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error("保存失敗: " + JSON.stringify(err.error));
      return;
    }
    toast.success(editingId ? "更新しました" : "作成しました");
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyClient);
    fetchClients();
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      clientType: client.clientType,
      department: client.department,
      contactPerson: client.contactPerson,
      honorific: client.honorific,
      postalCode: client.postalCode,
      address: client.address,
      phone: client.phone,
      email: client.email,
      paymentTerms: client.paymentTerms,
      defaultSubject: client.defaultSubject,
      defaultNotes: client.defaultNotes,
      tags: client.tags,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この取引先をアーカイブしますか？")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    toast.success("アーカイブしました");
    fetchClients();
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyClient);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded bg-white border border-[#e0e3e7] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#b0b5ba]" />
          <Input
            placeholder="取引先名、担当者名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-[30px] text-[12px]"
          />
        </div>
        <Button onClick={openNew} size="sm" className="gap-1 ml-auto h-[30px]">
          <Plus className="h-3.5 w-3.5" />
          取引先を追加
        </Button>
      </div>

      <div className="rounded bg-white border border-[#e0e3e7] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>取引先名</TableHead>
              <TableHead>区分</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>電話番号</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>タグ</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#8a8a8a]">
                  取引先がありません
                </TableCell>
              </TableRow>
            ) : (
              clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {c.clientType === "corporate" ? "法人" : "個人"}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.contactPerson}</TableCell>
                  <TableCell className="text-sm">{c.phone}</TableCell>
                  <TableCell className="text-sm">{c.email}</TableCell>
                  <TableCell>
                    {c.tags && c.tags.split(",").map((t) => (
                      <Badge key={t} variant="secondary" className="mr-1 text-xs">{t.trim()}</Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#e74c3c]" onClick={() => handleDelete(c.id)}>
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "取引先を編集" : "取引先を追加"}</DialogTitle>
            <DialogDescription>取引先の情報を入力してください。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>取引先名 *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>区分</Label>
                <Select value={form.clientType} onValueChange={(v) => setForm({ ...form, clientType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corporate">法人</SelectItem>
                    <SelectItem value="individual">個人</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>部署名</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>担当者名</Label>
                <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>敬称</Label>
                <Select value={form.honorific} onValueChange={(v) => setForm({ ...form, honorific: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="御中">御中</SelectItem>
                    <SelectItem value="様">様</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>郵便番号</Label>
                <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="000-0000" />
              </div>
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
              <Label>支払条件</Label>
              <Input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="月末締め翌月末払い" />
            </div>
            <div className="space-y-1.5">
              <Label>タグ（カンマ区切り）</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>デフォルト備考</Label>
              <Textarea value={form.defaultNotes} onChange={(e) => setForm({ ...form, defaultNotes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSave}>{editingId ? "更新" : "作成"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
