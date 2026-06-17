import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { connectDB } from "@/lib/db/connect";
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  forbiddenResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import { gunzipSync } from "zlib";
import mongoose, { Types } from "mongoose";
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

    let parsed: { collections: Record<string, unknown[] | { docs: unknown[]; indexes?: IndexInfo[] }> };
    try {
      parsed = JSON.parse(json);
    } catch {
      return errorResponse("Failed to parse backup file", 400);
    }

    if (!parsed?.collections || typeof parsed.collections !== "object") {
      return errorResponse("Invalid backup format", 400);
    }

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return serverErrorResponse("Database not connected");

    const results: Record<string, number> = {};

    for (const [colName, entry] of Object.entries(parsed.collections)) {
      const { docs, indexes } = normalizeCollectionEntry(entry);
      if (!docs) continue;

      const col = db.collection(colName);
      await col.deleteMany({});

      if (docs.length > 0) {
        // Rehydrate extended JSON _id and date fields
        const rehydrated = docs.map((doc) => rehydrateDoc(doc as Record<string, unknown>));
        await col.insertMany(rehydrated, { ordered: false });
      }

      if (indexes) {
        await recreateIndexes(col, indexes);
      }

      results[colName] = docs.length;
    }

    void writeAuditLog({
      action: "db.restored",
      actor: { id: req.user.id, name: req.user.name },
      metadata: { collections: results, filename: file.name },
    });

    return successResponse(
      { collections: results },
      "Database restored successfully"
    );
  } catch (err) {
    console.error("[restore] error", err);
    return serverErrorResponse("Restore failed");
  }
};

type IndexInfo = { key: Record<string, number | string>; name: string; [opt: string]: unknown };

// Backups written before index capture was added store `colName: docs[]` directly;
// newer backups store `colName: { docs, indexes }`. Support both.
function normalizeCollectionEntry(
  entry: unknown[] | { docs: unknown[]; indexes?: IndexInfo[] }
): { docs: unknown[] | null; indexes: IndexInfo[] | null } {
  if (Array.isArray(entry)) return { docs: entry, indexes: null };
  if (entry && Array.isArray(entry.docs)) return { docs: entry.docs, indexes: entry.indexes ?? null };
  return { docs: null, indexes: null };
}

async function recreateIndexes(
  col: ReturnType<NonNullable<typeof mongoose.connection.db>["collection"]>,
  indexes: IndexInfo[]
): Promise<void> {
  for (const idx of indexes) {
    if (idx.name === "_id_") continue; // created automatically
    const { key, name, ...options } = idx;
    try {
      await col.createIndex(key as Record<string, 1 | -1>, { name, ...options });
    } catch (err) {
      console.error(`[restore] failed to recreate index ${name} on ${col.collectionName}`, err);
    }
  }
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
    // MongoDB Extended JSON: { "$oid": "..." }
    if ("$oid" in obj && typeof obj.$oid === "string") {
      return new Types.ObjectId(obj.$oid);
    }
    // MongoDB Extended JSON: { "$date": "..." }
    if ("$date" in obj) {
      const d = obj.$date;
      return new Date(typeof d === "object" ? (d as { $numberLong: string }).$numberLong : String(d));
    }
    return rehydrateDoc(obj);
  }
  return v;
}

export const POST = withStaffAuth(postHandler);
