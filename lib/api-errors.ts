import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json(
      { error: "重複するデータがあります", code: "unique_conflict" },
      { status: 409 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json(
      { error: "対象データが見つかりません", code: "not_found" },
      { status: 404 }
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: "Internal server error", code: "internal_error" },
    { status: 500 }
  );
}
