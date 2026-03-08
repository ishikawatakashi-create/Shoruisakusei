import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-errors";
import { generatePdf } from "@/services/pdf";

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { buffer, filename } = await generatePdf(id);
    const safeName = encodeURIComponent(filename);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${safeName}`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("[PDF] generatePdf failed:", error);
    return toErrorResponse(error);
  }
}
