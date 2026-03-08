"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentType, DocumentStatus } from "@/types/document";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  CONVERSION_MAP,
} from "@/types/document";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Copy,
  FileDown,
  FileText,
  Trash2,
  ArrowRightLeft,
  Archive,
} from "lucide-react";

interface DocumentListProps {
  documentType: DocumentType;
  basePath: string;
}

interface DocumentRow {
  id: string;
  documentNumber: string;
  status: string;
  issueDate: string;
  clientDisplayName: string;
  subject: string;
  totalAmount: number;
  updatedAt: string;
  tags: string;
}

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "info" | "destructive"> = {
  draft: "secondary",
  issued: "info",
  sent: "warning",
  paid: "success",
  receipted: "success",
  archived: "outline",
};

export function DocumentList({ documentType, basePath }: DocumentListProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      type: documentType,
      sortBy,
      sortOrder: "desc",
    });
    if (search) params.set("search", search);
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const res = await fetch(`/api/documents?${params}`);
    const data = await res.json();
    setDocuments(data.documents || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [documentType, search, statusFilter, dateFrom, dateTo, sortBy]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id: string) => {
    if (!confirm("この書類を削除しますか？")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    toast.success("削除しました");
    fetchDocuments();
  };

  const handleArchive = async (id: string) => {
    await fetch(`/api/documents/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    toast.success("アーカイブしました");
    fetchDocuments();
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/documents/${id}/duplicate`, { method: "POST" });
    const doc = await res.json();
    toast.success("複製しました");
    router.push(`${basePath}/${doc.id}/edit`);
  };

  const handleConvert = async (id: string, targetType: DocumentType) => {
    const res = await fetch(`/api/documents/${id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType }),
    });
    const doc = await res.json();
    const paths: Record<string, string> = {
      estimate: "/estimates",
      delivery_note: "/delivery-notes",
      invoice: "/invoices",
      receipt: "/receipts",
    };
    toast.success(`${DOCUMENT_TYPE_LABELS[targetType]}に変換しました`);
    router.push(`${paths[targetType]}/${doc.id}/edit`);
  };

  const handleGeneratePdf = async (id: string) => {
    const res = await fetch(`/api/documents/${id}/pdf`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      window.open(data.url, "_blank");
      toast.success("PDFを生成しました");
    } else {
      toast.error("PDF生成に失敗しました");
    }
  };

  const conversionTargets = CONVERSION_MAP[documentType] || [];
  const title = DOCUMENT_TYPE_LABELS[documentType];

  return (
    <div className="space-y-4">
      {/* Toolbar - MF style filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded bg-white border border-[#e0e3e7] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#b0b5ba]" />
          <Input
            placeholder="書類番号、取引先名、件名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-[30px] text-[12px]"
          />
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#666]">
          <span>日</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[130px] h-[30px] text-[12px]"
          />
          <span>〜</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[130px] h-[30px] text-[12px]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[110px] h-[30px] text-[12px]">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {Object.entries(DOCUMENT_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[100px] h-[30px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">更新日</SelectItem>
            <SelectItem value="issueDate">発行日</SelectItem>
            <SelectItem value="createdAt">作成日</SelectItem>
            <SelectItem value="totalAmount">金額</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-[30px] text-[12px] text-[#8a8a8a]" onClick={() => { setSearch(""); setStatusFilter("all"); setDateFrom(""); setDateTo(""); }}>
          クリア
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`${basePath}/new`}>
            <Button size="sm" className="gap-1 h-[30px]">
              {title}を作成
            </Button>
          </Link>
        </div>
      </div>

      {/* Table - MF style */}
      <div className="rounded bg-white border border-[#e0e3e7] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#e0e3e7]">
              <TableHead className="w-36">書類番号</TableHead>
              <TableHead className="w-24">ステータス</TableHead>
              <TableHead className="w-28">発行日</TableHead>
              <TableHead>取引先</TableHead>
              <TableHead>件名</TableHead>
              <TableHead className="text-right w-28">金額</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#8a8a8a]">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f2f5]">
                    <FileText className="h-7 w-7 text-[#b0b5ba]" />
                  </div>
                  <p className="text-[13px] text-[#8a8a8a] mb-1">{title}はありません</p>
                  <p className="text-[12px] text-[#b0b5ba] mb-3">{title}を作成するにはこちらから</p>
                  <Link href={`${basePath}/new`}>
                    <Button size="sm" className="gap-1">
                      <Plus className="h-3 w-3" />
                      {title}を作成する
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id} className="cursor-pointer" onClick={() => router.push(`${basePath}/${doc.id}/edit`)}>
                  <TableCell className="font-mono text-[12px] text-[#4a9cf5]">
                    {doc.documentNumber}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[doc.status] || "secondary"}>
                      {DOCUMENT_STATUS_LABELS[doc.status as DocumentStatus] || doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[12px] text-[#666]">
                    {formatDate(doc.issueDate)}
                  </TableCell>
                  <TableCell>
                    {doc.clientDisplayName}
                  </TableCell>
                  <TableCell className="text-[#666]">{doc.subject}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(doc.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5 text-[#8a8a8a]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => router.push(`${basePath}/${doc.id}/edit`)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          編集
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(doc.id)}>
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          複製
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGeneratePdf(doc.id)}>
                          <FileDown className="mr-2 h-3.5 w-3.5" />
                          PDF発行
                        </DropdownMenuItem>
                        {conversionTargets.map((target) => (
                          <DropdownMenuItem key={target} onClick={() => handleConvert(doc.id, target)}>
                            <ArrowRightLeft className="mr-2 h-3.5 w-3.5" />
                            {DOCUMENT_TYPE_LABELS[target]}へ変換
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleArchive(doc.id)}>
                          <Archive className="mr-2 h-3.5 w-3.5" />
                          アーカイブ
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-[#e74c3c]" onClick={() => handleDelete(doc.id)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="text-[12px] text-[#8a8a8a]">
          {total}件の{title}
        </div>
      )}
    </div>
  );
}
