import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productFormSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") || "";
  const where: Record<string, unknown> = { isArchived: false };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { tags: { contains: search } },
    ];
  }
  const products = await prisma.product.findMany({ where, orderBy: { sortOrder: "asc" } });
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = productFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const product = await prisma.product.create({ data: parsed.data });
  return NextResponse.json(product, { status: 201 });
}
