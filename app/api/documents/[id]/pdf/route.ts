import { NextRequest, NextResponse } from "next/server";
import { generatePdf } from "@/services/pdf";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const pdfPath = await generatePdf(id);
    return NextResponse.json({ url: pdfPath, path: pdfPath });
  } catch (e) {
    console.error("PDF generation error:", e);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
