import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!["uploads", "pdfs"].includes(segments[0])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dataRoot = path.resolve(process.cwd(), "data");
  const filePath = path.resolve(dataRoot, ...segments);

  if (!filePath.startsWith(`${dataRoot}${path.sep}`) && filePath !== dataRoot) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition":
          ext === ".pdf" ? "inline" : `inline; filename="${segments[segments.length - 1]}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
