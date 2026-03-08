import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-errors";
import { documentStatusSchema } from "@/lib/validations";
import { documentRepository } from "@/repositories/document";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = documentStatusSchema.safeParse(body.status);
    if (!parsed.success) {
      return NextResponse.json({ error: "status is invalid" }, { status: 400 });
    }
    const doc = await documentRepository.updateStatus(id, parsed.data);
    return NextResponse.json(doc);
  } catch (error) {
    return toErrorResponse(error);
  }
}
