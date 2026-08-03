import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { successResponse, serverErrorResponse, forbiddenResponse } from "@/lib/utils/apiResponse";
import { writeAuditLog } from "@/lib/services/audit.service";
import { dumpDatabase } from "@/lib/db/backup";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import { createGzip } from "zlib";
import { createWriteStream, mkdirSync, readdirSync, statSync } from "fs";
import { join } from "path";

const BACKUP_DIR = process.env.BACKUP_DIR ?? join(process.cwd(), "backups");

function ensureBackupDir() {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

const getHandler = async (_req: AuthedRequest) => {
  if (_req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    ensureBackupDir();
    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".json.gz"))
      .map((f) => {
        const stats = statSync(join(BACKUP_DIR, f));
        return {
          filename: f,
          size: stats.size,
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return successResponse(files);
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const body = await req.json().catch(() => ({}));
    const label: string = body?.label ?? "";

    ensureBackupDir();

    const payload = await dumpDatabase();

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .slice(0, 19);
    const safeName = label
      ? `_${label.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40)}`
      : "";
    const filename = `backup_${timestamp}${safeName}.json.gz`;
    const filepath = join(BACKUP_DIR, filename);

    const gzip = createGzip();
    const out = createWriteStream(filepath);
    gzip.pipe(out);
    gzip.write(JSON.stringify(payload));
    gzip.end();

    await new Promise<void>((resolve, reject) => {
      out.on("finish", resolve);
      out.on("error", reject);
      gzip.on("error", reject);
    });

    const stats = statSync(filepath);

    void writeAuditLog({
      action: "db.backup_created",
      actor: { id: req.user.id, name: req.user.name },
      targetType: "Backup",
      metadata: { filename, size: stats.size },
    });

    return successResponse(
      { filename, size: stats.size, createdAt: stats.birthtime },
      "Backup created",
      201
    );
  } catch (err) {
    console.error("[backup] create error", err);
    return serverErrorResponse("Failed to create backup");
  }
};

export const GET = withStaffAuth(getHandler);
export const POST = withStaffAuth(postHandler);
