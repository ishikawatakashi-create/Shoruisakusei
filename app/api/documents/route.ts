import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-errors";
import { documentRepository } from "@/repositories/document";
import { documentService } from "@/services/document";
import { documentFormSchema, documentListQuerySchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const parsed = documentListQuerySchema.safeParse({
    type: request.nextUrl.searchParams.get("type") || undefined,
    search: request.nextUrl.searchParams.get("search") || undefined,
    status: request.nextUrl.searchParams.get("status") || undefined,
    dateFrom: request.nextUrl.searchParams.get("dateFrom") || undefined,
    dateTo: request.nextUrl.searchParams.get("dateTo") || undefined,
    clientId: request.nextUrl.searchParams.get("clientId") || undefined,
    sortBy: request.nextUrl.searchParams.get("sortBy") || undefined,
    sortOrder: request.nextUrl.searchParams.get("sortOrder") || undefined,
    page: request.nextUrl.searchParams.get("page") || undefined,
    perPage: request.nextUrl.searchParams.get("perPage") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await documentRepository.findMany({
    documentType: parsed.data.type,
    search: parsed.data.search,
    status: parsed.data.status,
    dateFrom: parsed.data.dateFrom,
    dateTo: parsed.data.dateTo,
    clientId: parsed.data.clientId,
    sortBy: parsed.data.sortBy,
    sortOrder: parsed.data.sortOrder,
    page: parsed.data.page,
    perPage: parsed.data.perPage,
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = documentFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const doc = await documentService.create(parsed.data);
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
