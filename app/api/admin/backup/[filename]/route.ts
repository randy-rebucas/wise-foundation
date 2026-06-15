import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import { createReadStream, existsSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const BACKUP_DIR = process.env.BACKUP_DIR ?? join(process.cwd(), "backups");

type Ctx = { params: Promise<{ filename: string }> };

const getHandler = async (_req: AuthedRequest, ctx?: unknown) => {
  try {
    const { filename } = await (ctx as Ctx).params;
    if (!filename.endsWith(".json.gz") || filename.includes("/") || filename.includes("..")) {
      return errorResponse("Invalid filename", 400);
    }

    const filepath = join(BACKUP_DIR, filename);
    if (!existsSync(filepath)) return errorResponse("Backup not found", 404);

    const stats = statSync(filepath);
    const stream = createReadStream(filepath);

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(stats.size),
      },
    });
  } catch {
    return serverErrorResponse();
  }
};

const deleteHandler = async (_req: AuthedRequest, ctx?: unknown) => {
  try {
    const { filename } = await (ctx as Ctx).params;
    if (!filename.endsWith(".json.gz") || filename.includes("/") || filename.includes("..")) {
      return errorResponse("Invalid filename", 400);
    }

    const filepath = join(BACKUP_DIR, filename);
    if (!existsSync(filepath)) return errorResponse("Backup not found", 404);

    unlinkSync(filepath);
    return successResponse(null, "Backup deleted");
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(getHandler);
export const DELETE = withStaffAuth(deleteHandler);
