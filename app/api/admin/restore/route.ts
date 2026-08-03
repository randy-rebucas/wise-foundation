import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  forbiddenResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import { gunzipSync } from "zlib";
import { restoreDatabase, type BackupPayload } from "@/lib/db/backup";
import { writeAuditLog } from "@/lib/services/audit.service";

export const maxDuration = 60;

const postHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const formData = await req.formData().catch(() => null);
    if (!formData) return errorResponse("Invalid form data", 400);

    const file = formData.get("file") as File | null;
    if (!file) return errorResponse("No file provided", 400);
    if (!file.name.endsWith(".json.gz")) {
      return errorResponse("File must be a .json.gz backup", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let json: string;
    try {
      json = gunzipSync(buffer).toString("utf-8");
    } catch {
      return errorResponse("Failed to decompress backup file", 400);
    }

    let payload: BackupPayload;
    try {
      payload = JSON.parse(json);
    } catch {
      return errorResponse("Failed to parse backup file", 400);
    }

    if (!payload?.tables || typeof payload.tables !== "object") {
      return errorResponse("Invalid backup format", 400);
    }

    const results = await restoreDatabase(payload);

    void writeAuditLog({
      action: "db.restored",
      actor: { id: req.user.id, name: req.user.name },
      metadata: { tables: results, filename: file.name },
    });

    return successResponse({ tables: results }, "Database restored successfully");
  } catch (err) {
    console.error("[restore] error", err);
    return serverErrorResponse("Restore failed");
  }
};

export const POST = withStaffAuth(postHandler);
