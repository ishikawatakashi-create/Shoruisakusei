import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-errors";
import { documentTypeSchema } from "@/lib/validations";
import { documentService } from "@/services/document";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = documentTypeSchema.safeParse(body.targetType);
    if (!parsed.success) {
      return NextResponse.json({ error: "targetType is required" }, { status: 400 });
    }
    const doc = await documentService.convert(id, parsed.data);
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
