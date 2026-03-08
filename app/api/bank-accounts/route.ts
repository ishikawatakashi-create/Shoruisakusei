import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bankAccountFormSchema } from "@/lib/validations";

export async function GET() {
  const accounts = await prisma.bankAccount.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(accounts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = bankAccountFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.isDefault) {
    await prisma.bankAccount.updateMany({ data: { isDefault: false } });
  }
  const account = await prisma.bankAccount.create({ data: parsed.data });
  return NextResponse.json(account, { status: 201 });
}
