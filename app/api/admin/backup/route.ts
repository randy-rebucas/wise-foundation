import { NextResponse } from "next/server";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { connectDB } from "@/lib/db/connect";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { createWriteStream, mkdirSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { Readable } from "stream";
import mongoose from "mongoose";

const BACKUP_DIR = process.env.BACKUP_DIR ?? join(process.cwd(), "backups");

function ensureBackupDir() {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

const getHandler = async (_req: AuthedRequest) => {
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
  try {
    const body = await req.json().catch(() => ({}));
    const label: string = body?.label ?? "";

    ensureBackupDir();
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) return serverErrorResponse("Database not connected");

    const collections = await db.listCollections().toArray();
    const data: Record<string, unknown[]> = {};

    for (const col of collections) {
      const docs = await db.collection(col.name).find({}).toArray();
      data[col.name] = docs;
    }

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

    const json = JSON.stringify({ createdAt: new Date(), collections: data });
    const readable = Readable.from([Buffer.from(json, "utf-8")]);
    const gzip = createGzip();
    const out = createWriteStream(filepath);

    await pipeline(readable, gzip, out);

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
