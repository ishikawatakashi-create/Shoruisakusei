import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const type = formData.get("type") as string; // "logo" or "seal"
  
  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "data", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name);
  const filename = `${type || "file"}_${Date.now()}${ext}`;
  const filepath = path.join(uploadDir, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  return NextResponse.json({ path: `/data/uploads/${filename}`, filename });
}
