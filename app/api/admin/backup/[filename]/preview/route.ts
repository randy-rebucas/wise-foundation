import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  forbiddenResponse,
  notFoundResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import { gunzipSync } from "zlib";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const BACKUP_DIR = process.env.BACKUP_DIR ?? join(process.cwd(), "backups");

type Ctx = { params: Promise<{ filename: string }> };

const getHandler = async (_req: AuthedRequest, ctx?: unknown) => {
  if (_req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { filename } = await (ctx as Ctx).params;
    if (!filename.endsWith(".json.gz") || filename.includes("/") || filename.includes("..")) {
      return errorResponse("Invalid filename", 400);
    }

    const filepath = join(BACKUP_DIR, filename);
    if (!existsSync(filepath)) return notFoundResponse("Backup not found");

    let parsed: { createdAt?: string; tables: Record<string, unknown[]> };
    try {
      const json = gunzipSync(readFileSync(filepath)).toString("utf-8");
      parsed = JSON.parse(json);
    } catch {
      return errorResponse("Failed to read backup file", 400);
    }

    if (!parsed?.tables || typeof parsed.tables !== "object") {
      return errorResponse("Invalid backup format", 400);
    }

    const collections = Object.entries(parsed.tables).map(([name, docs]) => ({
      name,
      count: Array.isArray(docs) ? docs.length : 0,
      indexCount: 0,
      sample: Array.isArray(docs) && docs.length > 0 ? docs[0] : null,
    }));

    return successResponse({
      filename,
      createdAt: parsed.createdAt ?? null,
      collections,
    });
  } catch (err) {
    console.error("[backup] preview error", err);
    return serverErrorResponse("Failed to preview backup");
  }
};

export const GET = withStaffAuth(getHandler);
