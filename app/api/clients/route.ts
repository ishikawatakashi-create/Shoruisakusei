import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { clientFormSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") || "";
    const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";

    const where: Record<string, unknown> = {};
    if (!includeArchived) where.isArchived = false;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const clients = await prisma.client.findMany({ where, orderBy: { updatedAt: "desc" } });
    return NextResponse.json(clients);
  } catch (error) {
    console.error("[api/clients GET]", error);
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = clientFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const client = await prisma.client.create({ data: parsed.data });
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
