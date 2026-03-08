import { NextRequest, NextResponse } from "next/server";
import { documentRepository } from "@/repositories/document";
import { documentService } from "@/services/document";
import { documentFormSchema } from "@/lib/validations";
import type { DocumentType, DocumentStatus } from "@/types/document";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params = {
    documentType: searchParams.get("type") as DocumentType,
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as DocumentStatus) || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    sortBy: searchParams.get("sortBy") || "updatedAt",
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    page: Number(searchParams.get("page")) || 1,
    perPage: Number(searchParams.get("perPage")) || 50,
  };

  if (!params.documentType) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  const result = await documentRepository.findMany(params);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = documentFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const doc = await documentService.create(parsed.data);
  return NextResponse.json(doc, { status: 201 });
}
