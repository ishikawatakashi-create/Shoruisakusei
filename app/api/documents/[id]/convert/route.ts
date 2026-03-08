import { NextRequest, NextResponse } from "next/server";
import { documentService } from "@/services/document";
import type { DocumentType } from "@/types/document";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const targetType = body.targetType as DocumentType;
  if (!targetType) {
    return NextResponse.json({ error: "targetType is required" }, { status: 400 });
  }
  const doc = await documentService.convert(id, targetType);
  return NextResponse.json(doc, { status: 201 });
}
