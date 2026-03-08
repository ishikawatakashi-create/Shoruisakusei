import { toErrorResponse } from "@/lib/api-errors";
import { createBackupExportResponse } from "@/lib/backup";

export const runtime = "nodejs";

export async function GET() {
  try {
    return await createBackupExportResponse();
  } catch (error) {
    return toErrorResponse(error);
  }
}
