import { NextRequest, NextResponse } from "next/server";
import { generateDocumentNumber } from "@/services/numbering";
import type { DocumentType } from "@/types/document";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") as DocumentType;
  if (!type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }
  const number = await generateDocumentNumber(type);
  return NextResponse.json({ number });
}
