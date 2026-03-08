import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { businessInfoFormSchema } from "@/lib/validations";

export async function GET() {
  try {
    let info = await prisma.businessInfo.findUnique({ where: { id: "default" } });
    if (!info) {
      info = await prisma.businessInfo.create({ data: { id: "default" } });
    }
    return NextResponse.json(info);
  } catch (error) {
    console.error("[api/settings/business GET]", error);
    return toErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = businessInfoFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const info = await prisma.businessInfo.upsert({
      where: { id: "default" },
      update: parsed.data,
      create: { id: "default", ...parsed.data },
    });
    return NextResponse.json(info);
  } catch (error) {
    return toErrorResponse(error);
  }
}
