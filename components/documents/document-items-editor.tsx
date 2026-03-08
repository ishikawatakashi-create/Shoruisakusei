"use client";

import { useCallback } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentItemFormData, TaxCategory } from "@/types/document";
import { TAX_CATEGORY_LABELS, TAX_RATE_MAP, calculateItemAmount } from "@/types/document";

interface Product {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  unit: string;
  taxRate: number;
  defaultQuantity: number;
}

interface DocumentItemsEditorProps {
  items: DocumentItemFormData[];
  onChange: (items: DocumentItemFormData[]) => void;
  products?: Product[];
}

function taxCategoryFromRate(rate: number): TaxCategory {
  if (rate === 10) return "taxable_10";
  if (rate === 8) return "taxable_8";
  if (rate === 0) return "exempt";
  return "taxable_10";
}

export function DocumentItemsEditor({ items, onChange, products = [] }: DocumentItemsEditorProps) {
  const addItem = useCallback(() => {
    const newItem: DocumentItemFormData = {
      sortOrder: items.length,
      productName: "",
      description: "",
      unitPrice: 0,
      quantity: 1,
      unit: "",
      taxRate: 10,
      taxCategory: "taxable_10",
      amount: 0,
      memo: "",
    };
    onChange([...items, newItem]);
  }, [items, onChange]);

  const removeItem = useCallback(
    (index: number) => {
      const newItems = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sortOrder: i }));
      onChange(newItems);
    },
    [items, onChange]
  );

  const updateItem = useCallback(
    (index: number, field: keyof DocumentItemFormData, value: unknown) => {
      const newItems = [...items];
      const item = { ...newItems[index], [field]: value };

      if (field === "taxCategory") {
        item.taxRate = TAX_RATE_MAP[value as TaxCategory];
      }
      if (field === "unitPrice" || field === "quantity") {
        item.amount = calculateItemAmount(
          field === "unitPrice" ? (value as number) : item.unitPrice,
          field === "quantity" ? (value as number) : item.quantity
        );
      }

      newItems[index] = item;
      onChange(newItems);
    },
    [items, onChange]
  );

  const selectProduct = useCallback(
    (index: number, productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        productName: product.name,
        description: product.description,
        unitPrice: product.unitPrice,
        quantity: product.defaultQuantity,
        unit: product.unit,
        taxRate: product.taxRate,
        taxCategory: taxCategoryFromRate(product.taxRate),
        amount: calculateItemAmount(product.unitPrice, product.defaultQuantity),
      };
      onChange(newItems);
    },
    [items, onChange, products]
  );

  const moveItem = useCallback(
    (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= items.length) return;
      const newItems = [...items];
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      onChange(newItems.map((item, i) => ({ ...item, sortOrder: i })));
    },
    [items, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">明細</h3>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
          <Plus className="h-3 w-3" />
          行追加
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          <p>明細行がありません</p>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-2 gap-1">
            <Plus className="h-3 w-3" />
            行を追加
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="rounded-md border bg-background p-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => moveItem(index, "up")}
                  >
                    <GripVertical className="h-3 w-3 rotate-90" />
                  </button>
                  <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, "down")}
                  >
                    <GripVertical className="h-3 w-3 rotate-90" />
                  </button>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    {products.length > 0 && (
                      <Select onValueChange={(val) => selectProduct(index, val)}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue placeholder="品目選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      placeholder="品目名 *"
                      value={item.productName}
                      onChange={(e) => updateItem(index, "productName", e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                  </div>
                  <Input
                    placeholder="詳細説明"
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="grid grid-cols-5 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">単価</label>
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">数量</label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">単位</label>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItem(index, "unit", e.target.value)}
                        className="h-8 text-xs"
                        placeholder="個,式,h"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">税区分</label>
                      <Select
                        value={item.taxCategory}
                        onValueChange={(val) => updateItem(index, "taxCategory", val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TAX_CATEGORY_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key} className="text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">金額</label>
                      <div className="h-8 flex items-center text-xs font-medium text-right px-2 bg-muted rounded-md">
                        {new Intl.NumberFormat("ja-JP").format(item.unitPrice * item.quantity)}円
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
