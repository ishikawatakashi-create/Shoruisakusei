import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { productFormSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") || "";
    const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
    const where: Record<string, unknown> = {};
    if (!includeArchived) where.isArchived = false;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
      ];
    }
    const products = await prisma.product.findMany({ where, orderBy: { sortOrder: "asc" } });
    return NextResponse.json(products);
  } catch (error) {
    console.error("[api/products GET]", error);
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = productFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const product = await prisma.product.create({ data: parsed.data });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
