"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
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
import type { DocumentSortField, DocumentStatus, DocumentType } from "@/types/document";
import {
  CONVERSION_MAP,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
} from "@/types/document";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Archive,
  ArrowRightLeft,
  Copy,
  FileDown,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
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

interface ListState {
  search: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
  sortBy: DocumentSortField;
  page: number;
  perPage: number;
}

const STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "success" | "warning" | "info" | "destructive"
> = {
  draft: "secondary",
  issued: "info",
  sent: "warning",
  paid: "success",
  receipted: "success",
  archived: "outline",
};

const DEFAULT_SORT_BY: DocumentSortField = "updatedAt";
const DEFAULT_PER_PAGE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const SORT_FIELDS: DocumentSortField[] = ["updatedAt", "issueDate", "createdAt", "totalAmount"];

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseSortBy(value: string | null): DocumentSortField {
  return SORT_FIELDS.includes(value as DocumentSortField) ? (value as DocumentSortField) : DEFAULT_SORT_BY;
}

function readListState(searchParams: ReadonlyURLSearchParams): ListState {
  return {
    search: searchParams.get("search") ?? "",
    statusFilter: searchParams.get("status") ?? "all",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    sortBy: parseSortBy(searchParams.get("sortBy")),
    page: parsePositiveInt(searchParams.get("page"), 1),
    perPage: parsePositiveInt(searchParams.get("perPage"), DEFAULT_PER_PAGE),
  };
}

function buildUrlSearchParams(state: ListState) {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.statusFilter !== "all") params.set("status", state.statusFilter);
  if (state.dateFrom) params.set("dateFrom", state.dateFrom);
  if (state.dateTo) params.set("dateTo", state.dateTo);
  if (state.sortBy !== DEFAULT_SORT_BY) params.set("sortBy", state.sortBy);
  if (state.page !== 1) params.set("page", String(state.page));
  if (state.perPage !== DEFAULT_PER_PAGE) params.set("perPage", String(state.perPage));
  return params;
}

export function DocumentList({ documentType, basePath }: DocumentListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialState = readListState(searchParams);

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchInput, setSearchInput] = useState(initialState.search);
  const [search, setSearch] = useState(initialState.search);
  const [statusFilter, setStatusFilter] = useState(initialState.statusFilter);
  const [dateFrom, setDateFrom] = useState(initialState.dateFrom);
  const [dateTo, setDateTo] = useState(initialState.dateTo);
  const [sortBy, setSortBy] = useState<DocumentSortField>(initialState.sortBy);
  const [page, setPage] = useState(initialState.page);
  const [perPage, setPerPage] = useState(initialState.perPage);

  useEffect(() => {
    const nextState = readListState(searchParams);
    setSearchInput((current) => (current === nextState.search ? current : nextState.search));
    setSearch((current) => (current === nextState.search ? current : nextState.search));
    setStatusFilter((current) => (current === nextState.statusFilter ? current : nextState.statusFilter));
    setDateFrom((current) => (current === nextState.dateFrom ? current : nextState.dateFrom));
    setDateTo((current) => (current === nextState.dateTo ? current : nextState.dateTo));
    setSortBy((current) => (current === nextState.sortBy ? current : nextState.sortBy));
    setPage((current) => (current === nextState.page ? current : nextState.page));
    setPerPage((current) => (current === nextState.perPage ? current : nextState.perPage));
  }, [searchParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch((current) => (current === searchInput ? current : searchInput));
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const nextParams = buildUrlSearchParams({
      search,
      statusFilter,
      dateFrom,
      dateTo,
      sortBy,
      page,
      perPage,
    }).toString();

    if (nextParams === searchParams.toString()) {
      return;
    }

    router.replace(nextParams ? `${pathname}?${nextParams}` : pathname, { scroll: false });
  }, [dateFrom, dateTo, page, pathname, perPage, router, search, searchParams, sortBy, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDocuments() {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          type: documentType,
          sortBy,
          sortOrder: "desc",
          page: String(page),
          perPage: String(perPage),
        });
        if (search) params.set("search", search);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(`/api/documents?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("書類一覧の取得に失敗しました");
        }

        const data = await res.json();
        const nextTotal = data.total || 0;
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / perPage));

        if (nextTotal > 0 && page > nextTotalPages) {
          setPage(nextTotalPages);
          return;
        }

        setDocuments(data.documents || []);
        setTotal(nextTotal);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error(error);
        toast.error("一覧の取得に失敗しました");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchDocuments();
    return () => controller.abort();
  }, [dateFrom, dateTo, documentType, page, perPage, refreshKey, search, sortBy, statusFilter]);

  const refreshDocuments = () => {
    setRefreshKey((current) => current + 1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この書類を削除しますか？")) return;

    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("削除に失敗しました");
      return;
    }

    toast.success("削除しました");
    refreshDocuments();
  };

  const handleArchive = async (id: string) => {
    const res = await fetch(`/api/documents/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });

    if (!res.ok) {
      toast.error("アーカイブに失敗しました");
      return;
    }

    toast.success("アーカイブしました");
    refreshDocuments();
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/documents/${id}/duplicate`, { method: "POST" });
    if (!res.ok) {
      toast.error("複製に失敗しました");
      return;
    }

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

    if (!res.ok) {
      toast.error("変換に失敗しました");
      return;
    }

    const doc = await res.json();
    const paths: Record<DocumentType, string> = {
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
    if (!res.ok) {
      toast.error("PDF生成に失敗しました");
      return;
    }

    const data = await res.json();
    window.open(data.url, "_blank");
    toast.success("PDFを生成しました");
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortBy(DEFAULT_SORT_BY);
    setPage(1);
    setPerPage(DEFAULT_PER_PAGE);
  };

  const conversionTargets = CONVERSION_MAP[documentType] || [];
  const title = DOCUMENT_TYPE_LABELS[documentType];
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const pageEnd = total === 0 ? 0 : Math.min(page * perPage, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded border border-[#e0e3e7] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#b0b5ba]" />
          <Input
            placeholder="書類番号、取引先名、件名で検索..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            className="h-[30px] pl-8 text-[12px]"
          />
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#666]">
          <span>日</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="h-[30px] w-[130px] text-[12px]"
          />
          <span>〜</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="h-[30px] w-[130px] text-[12px]"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-[30px] w-[110px] text-[12px]">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {Object.entries(DOCUMENT_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(value as DocumentSortField);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-[30px] w-[100px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">更新日</SelectItem>
            <SelectItem value="issueDate">発行日</SelectItem>
            <SelectItem value="createdAt">作成日</SelectItem>
            <SelectItem value="totalAmount">金額</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={String(perPage)}
          onValueChange={(value) => {
            setPerPage(Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="h-[30px] w-[92px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20件</SelectItem>
            <SelectItem value="50">50件</SelectItem>
            <SelectItem value="100">100件</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-[30px] text-[12px] text-[#8a8a8a]"
          onClick={clearFilters}
        >
          クリア
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`${basePath}/new`}>
            <Button size="sm" className="h-[30px] gap-1">
              {title}を作成
            </Button>
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded border border-[#e0e3e7] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#e0e3e7]">
              <TableHead className="w-36">書類番号</TableHead>
              <TableHead className="w-24">ステータス</TableHead>
              <TableHead className="w-28">発行日</TableHead>
              <TableHead>取引先</TableHead>
              <TableHead>件名</TableHead>
              <TableHead className="w-28 text-right">金額</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-[#8a8a8a]">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f2f5]">
                    <FileText className="h-7 w-7 text-[#b0b5ba]" />
                  </div>
                  <p className="mb-1 text-[13px] text-[#8a8a8a]">{title}はありません</p>
                  <p className="mb-3 text-[12px] text-[#b0b5ba]">{title}を作成するにはこちらから</p>
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
                <TableRow
                  key={doc.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`${basePath}/${doc.id}/edit`)}
                >
                  <TableCell className="font-mono text-[12px] text-[#4a9cf5]">{doc.documentNumber}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[doc.status] || "secondary"}>
                      {DOCUMENT_STATUS_LABELS[doc.status as DocumentStatus] || doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[12px] text-[#666]">{formatDate(doc.issueDate)}</TableCell>
                  <TableCell>{doc.clientDisplayName}</TableCell>
                  <TableCell className="text-[#666]">{doc.subject}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(doc.totalAmount)}</TableCell>
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
        <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#8a8a8a]">
          <div>
            {total}件中 {pageStart}-{pageEnd}件の{title}
          </div>
          <div className="flex items-center gap-2">
            <span>
              {page}/{totalPages}ページ
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-[30px] text-[12px]"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              前へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-[30px] text-[12px]"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
            >
              次へ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
