import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-errors";
import { documentService } from "@/services/document";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const doc = await documentService.duplicate(id);
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
