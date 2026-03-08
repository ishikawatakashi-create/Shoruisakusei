import { NextRequest, NextResponse } from "next/server";
import { documentRepository } from "@/repositories/document";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const doc = await documentRepository.updateStatus(id, body.status);
  return NextResponse.json(doc);
}
