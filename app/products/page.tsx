"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  unit: string;
  taxRate: number;
  defaultQuantity: number;
  sortOrder: number;
  tags: string;
  isArchived: boolean;
}

const emptyProduct = {
  name: "",
  description: "",
  unitPrice: 0,
  unit: "",
  taxRate: 10,
  defaultQuantity: 1,
  sortOrder: 0,
  tags: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"active" | "archived" | "all">("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProduct);

  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (viewMode !== "active") params.set("includeArchived", "true");

    const res = await fetch(`/api/products?${params.toString()}`);
    setProducts(await res.json());
  }, [search, viewMode]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const handleSave = async () => {
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/products/${editingId}` : "/api/products";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        unitPrice: Number(form.unitPrice),
        taxRate: Number(form.taxRate),
        defaultQuantity: Number(form.defaultQuantity),
        sortOrder: Number(form.sortOrder),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error("保存失敗: " + JSON.stringify(err.error));
      return;
    }

    toast.success(editingId ? "更新しました" : "作成しました");
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyProduct);
    fetchProducts();
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      unitPrice: product.unitPrice,
      unit: product.unit,
      taxRate: product.taxRate,
      defaultQuantity: product.defaultQuantity,
      sortOrder: product.sortOrder,
      tags: product.tags,
    });
    setDialogOpen(true);
  };

  const handleArchive = async (id: string) => {
    if (!confirm("この品目をアーカイブしますか？")) return;

    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("アーカイブに失敗しました");
      return;
    }

    toast.success("アーカイブしました");
    fetchProducts();
  };

  const handleRestore = async (id: string) => {
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: false }),
    });

    if (!res.ok) {
      toast.error("復元に失敗しました");
      return;
    }

    toast.success("復元しました");
    fetchProducts();
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyProduct);
    setDialogOpen(true);
  };

  const visibleProducts = products.filter((product) => {
    if (viewMode === "archived") return product.isArchived;
    if (viewMode === "all") return true;
    return !product.isArchived;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded border border-[#e0e3e7] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#b0b5ba]" />
          <Input
            placeholder="品目名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-[30px] pl-8 text-[12px]"
          />
        </div>
        <Select value={viewMode} onValueChange={(value) => setViewMode(value as "active" | "archived" | "all")}>
          <SelectTrigger className="h-[30px] w-[150px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">通常表示</SelectItem>
            <SelectItem value="archived">アーカイブのみ</SelectItem>
            <SelectItem value="all">すべて表示</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openNew} className="ml-auto h-[30px] gap-1">
          <Plus className="h-3.5 w-3.5" />
          品目を追加
        </Button>
      </div>

      <div className="overflow-hidden rounded border border-[#e0e3e7] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>品目名</TableHead>
              <TableHead>説明</TableHead>
              <TableHead className="text-right">単価</TableHead>
              <TableHead>単位</TableHead>
              <TableHead>税率</TableHead>
              <TableHead>タグ</TableHead>
              <TableHead className="w-28">状態</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  品目がありません
                </TableCell>
              </TableRow>
            ) : (
              visibleProducts.map((product) => (
                <TableRow key={product.id} className={product.isArchived ? "opacity-70" : undefined}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{product.description}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.unitPrice)}</TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell>{product.taxRate}%</TableCell>
                  <TableCell>
                    {product.tags &&
                      product.tags.split(",").map((tag) => (
                        <Badge key={tag} variant="secondary" className="mr-1 text-xs">
                          {tag.trim()}
                        </Badge>
                      ))}
                  </TableCell>
                  <TableCell>
                    {product.isArchived ? <Badge variant="secondary">アーカイブ</Badge> : <Badge variant="outline">通常</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(product)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {product.isArchived ? (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-[12px]" onClick={() => handleRestore(product.id)}>
                          復元
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleArchive(product.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
            <DialogTitle>{editingId ? "品目を編集" : "品目を追加"}</DialogTitle>
            <DialogDescription>品目の情報を入力してください。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>品目名 *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>説明</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>単価</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>単位</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="個,式,h"
                />
              </div>
              <div className="space-y-1.5">
                <Label>税率(%)</Label>
                <Select value={String(form.taxRate)} onValueChange={(value) => setForm({ ...form, taxRate: Number(value) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="8">8%</SelectItem>
                    <SelectItem value="0">0%(非課税)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>デフォルト数量</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.defaultQuantity}
                  onChange={(e) => setForm({ ...form, defaultQuantity: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>並び順</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>タグ（カンマ区切り）</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave}>{editingId ? "更新" : "作成"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
