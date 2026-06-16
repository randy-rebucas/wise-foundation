import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { connectDB } from "@/lib/db/connect";
import { successResponse, serverErrorResponse, forbiddenResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import { createGzip } from "zlib";
import { createWriteStream, mkdirSync, readdirSync, statSync } from "fs";
import { join } from "path";
import mongoose from "mongoose";

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
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) return serverErrorResponse("Database not connected");

    const collections = await db.listCollections().toArray();

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

    // Stream each collection via cursor so the entire DB is never held in memory
    gzip.write(`{"createdAt":${JSON.stringify(new Date())},"collections":{`);
    for (let i = 0; i < collections.length; i++) {
      const colName = collections[i].name;
      gzip.write(`${i === 0 ? "" : ","}${JSON.stringify(colName)}:[`);
      let first = true;
      for await (const doc of db.collection(colName).find({})) {
        gzip.write(`${first ? "" : ","}${JSON.stringify(doc)}`);
        first = false;
      }
      gzip.write("]");
    }
    gzip.write("}}");
    gzip.end();

    await new Promise<void>((resolve, reject) => {
      out.on("finish", resolve);
      out.on("error", reject);
      gzip.on("error", reject);
    });

    const stats = statSync(filepath);
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
