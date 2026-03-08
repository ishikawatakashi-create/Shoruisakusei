import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_UPLOAD_TYPES = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
]);
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const type = formData.get("type") as string; // "logo" or "seal"

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (type !== "logo" && type !== "seal") {
    return NextResponse.json({ error: "type is invalid" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: "File is too large" }, { status: 400 });
  }

  const ext = ALLOWED_UPLOAD_TYPES.get(file.type);
  if (!ext) {
    return NextResponse.json({ error: "File type is not allowed" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "data", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${type || "file"}_${Date.now()}${ext}`;
  const filepath = path.join(uploadDir, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  return NextResponse.json({ path: `/data/uploads/${filename}`, filename });
}
