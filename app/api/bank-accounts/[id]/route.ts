import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { bankAccountFormSchema } from "@/lib/validations";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await prisma.bankAccount.findUnique({ where: { id } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(account);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = bankAccountFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    if (parsed.data.isDefault) {
      await prisma.bankAccount.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
    }
    const account = await prisma.bankAccount.update({ where: { id }, data: parsed.data });
    return NextResponse.json(account);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.bankAccount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
