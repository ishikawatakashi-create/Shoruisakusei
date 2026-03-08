import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-errors";
import { generatePdf } from "@/services/pdf";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const pdfPath = await generatePdf(id);
    return NextResponse.json({ url: pdfPath, path: pdfPath });
  } catch (error) {
    return toErrorResponse(error);
  }
}
