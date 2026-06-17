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
import mongoose, { Types } from "mongoose";
import { writeAuditLog } from "@/lib/services/audit.service";

export const maxDuration = 60;

const BACKUP_DIR = process.env.BACKUP_DIR ?? join(process.cwd(), "backups");

type Ctx = { params: Promise<{ filename: string }> };

const postHandler = async (req: AuthedRequest, ctx?: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { filename } = await (ctx as Ctx).params;
    if (!filename.endsWith(".json.gz") || filename.includes("/") || filename.includes("..")) {
      return errorResponse("Invalid filename", 400);
    }

    const filepath = join(BACKUP_DIR, filename);
    if (!existsSync(filepath)) return notFoundResponse("Backup not found");

    const body = await req.json().catch(() => ({}));
    const targetUri: string = body?.connectionString ?? "";
    if (!targetUri || typeof targetUri !== "string") {
      return errorResponse("Target connection string is required", 400);
    }
    if (!targetUri.startsWith("mongodb://") && !targetUri.startsWith("mongodb+srv://")) {
      return errorResponse("Invalid MongoDB connection string", 400);
    }

    type IndexInfo = { key: Record<string, number | string>; name: string; [opt: string]: unknown };
    type CollectionEntry = unknown[] | { docs: unknown[]; indexes?: IndexInfo[] };
    let parsed: { collections: Record<string, CollectionEntry> };
    try {
      const json = gunzipSync(readFileSync(filepath)).toString("utf-8");
      parsed = JSON.parse(json);
    } catch {
      return errorResponse("Failed to read backup file", 400);
    }

    if (!parsed?.collections || typeof parsed.collections !== "object") {
      return errorResponse("Invalid backup format", 400);
    }

    const connection = await mongoose.createConnection(targetUri).asPromise();
    const results: Record<string, number> = {};

    try {
      const db = connection.db;
      if (!db) return serverErrorResponse("Failed to connect to target database");

      for (const [colName, entry] of Object.entries(parsed.collections)) {
        const docs = Array.isArray(entry) ? entry : Array.isArray(entry?.docs) ? entry.docs : null;
        const indexes = Array.isArray(entry) ? null : entry?.indexes ?? null;
        if (!docs) continue;

        const col = db.collection(colName);
        if (docs.length > 0) {
          const rehydrated = docs.map((doc) => rehydrateDoc(doc as Record<string, unknown>));
          await col.insertMany(rehydrated, { ordered: false });
        }

        if (indexes) {
          for (const idx of indexes) {
            if (idx.name === "_id_") continue;
            const { key, name, ...options } = idx;
            try {
              await col.createIndex(key as Record<string, 1 | -1>, { name, ...options });
            } catch (err) {
              console.error(`[transfer] failed to recreate index ${name} on ${colName}`, err);
            }
          }
        }

        results[colName] = docs.length;
      }
    } finally {
      await connection.close();
    }

    void writeAuditLog({
      action: "db.transferred",
      actor: { id: req.user.id, name: req.user.name },
      metadata: { collections: results, filename, target: maskUri(targetUri) },
    });

    return successResponse({ collections: results }, "Backup transferred successfully");
  } catch (err) {
    console.error("[backup] transfer error", err);
    return serverErrorResponse("Transfer failed");
  }
};

function maskUri(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
}

function rehydrateDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    out[k] = rehydrateValue(v);
  }
  return out;
}

function rehydrateValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(rehydrateValue);
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if ("$oid" in obj && typeof obj.$oid === "string") {
      return new Types.ObjectId(obj.$oid);
    }
    if ("$date" in obj) {
      const d = obj.$date;
      return new Date(typeof d === "object" ? (d as { $numberLong: string }).$numberLong : String(d));
    }
    return rehydrateDoc(obj);
  }
  return v;
}

export const POST = withStaffAuth(postHandler);
