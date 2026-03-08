import { NextRequest, NextResponse } from "next/server";
import { rm } from "fs/promises";
import { toErrorResponse } from "@/lib/api-errors";
import { parseBackupUpload, restoreBackupData, restoreBackupFiles } from "@/lib/backup";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let stagingRoot: string | undefined;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Backup file is required" }, { status: 400 });
    }

    const parsed = await parseBackupUpload(file);
    stagingRoot = parsed.stagingRoot;
    await restoreBackupData(parsed.backup);
    if (parsed.stagingRoot) {
      await restoreBackupFiles(parsed.stagingRoot);
    }

    return NextResponse.json({
      success: true,
      message: parsed.stagingRoot
        ? "Import completed with files"
        : "Import completed",
    });
  } catch (error) {
    if (stagingRoot) {
      await rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
    }
    return toErrorResponse(error);
  }
}
