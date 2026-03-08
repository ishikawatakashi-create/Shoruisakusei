import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { bankAccountFormSchema } from "@/lib/validations";

export async function GET() {
  try {
    const accounts = await prisma.bankAccount.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("[api/bank-accounts GET]", error);
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
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
  } catch (error) {
    return toErrorResponse(error);
  }
}
