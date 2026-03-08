import { NextRequest, NextResponse } from "next/server";
import { documentRepository } from "@/repositories/document";
import { documentService } from "@/services/document";
import { documentFormSchema } from "@/lib/validations";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await documentRepository.findById(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = documentFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const doc = await documentService.update(id, parsed.data);
  return NextResponse.json(doc);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await documentRepository.delete(id);
  return NextResponse.json({ success: true });
}
