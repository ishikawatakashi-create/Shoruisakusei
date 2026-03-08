import { NextRequest, NextResponse } from "next/server";
import { documentService } from "@/services/document";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await documentService.duplicate(id);
  return NextResponse.json(doc, { status: 201 });
}
