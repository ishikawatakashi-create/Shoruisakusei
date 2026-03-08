import { NextRequest, NextResponse } from "next/server";
import { documentTypeSchema } from "@/lib/validations";
import { previewDocumentNumber } from "@/services/numbering";

export async function GET(request: NextRequest) {
  const parsed = documentTypeSchema.safeParse(request.nextUrl.searchParams.get("type"));
  if (!parsed.success) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }
  const number = await previewDocumentNumber(parsed.data);
  return NextResponse.json({ number });
}
