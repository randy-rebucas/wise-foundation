/**
 * Database backup / restore CLI.
 *
 * Usage:
 *   npm run db:backup              — create a timestamped backup
 *   npm run db:backup -- --label pre-migration
 *   npm run db:restore -- --file backups/backup_2025-01-01_12-00-00.json.gz
 *   npm run db:restore -- --file backups/backup_2025-01-01_12-00-00.json.gz --drop
 *   npm run db:backup:list         — list existing backups
 */

import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createGzip, gunzipSync } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env.local");
  process.exit(1);
}

const BACKUP_DIR = process.env.BACKUP_DIR ?? path.join(ROOT, "backups");

// ── helpers ──────────────────────────────────────────────────────────────────

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function connect() {
  process.stdout.write("Connecting to MongoDB… ");
  await mongoose.connect(MONGODB_URI!);
  console.log("connected.");
}

// ── backup ───────────────────────────────────────────────────────────────────

async function backup() {
  const label = arg("--label");
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  await connect();
  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();

  console.log(`Exporting ${collections.length} collection(s)…`);
  const data: Record<string, unknown[]> = {};

  for (const col of collections) {
    const docs = await db.collection(col.name).find({}).toArray();
    data[col.name] = docs;
    console.log(`  ${col.name}: ${docs.length} document(s)`);
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
  const filepath = path.join(BACKUP_DIR, filename);

  const json = JSON.stringify({ createdAt: new Date(), collections: data });
  const readable = Readable.from([Buffer.from(json, "utf-8")]);
  const gzip = createGzip();
  const out = fs.createWriteStream(filepath);

  await pipeline(readable, gzip, out);

  const size = fs.statSync(filepath).size;
  const kb = (size / 1024).toFixed(1);
  console.log(`\nBackup written → ${filepath} (${kb} KB)`);

  await mongoose.disconnect();
}

// ── restore ──────────────────────────────────────────────────────────────────

async function restore() {
  const file = arg("--file");
  if (!file) {
    console.error("Usage: npm run db:restore -- --file <path-to-backup.json.gz>");
    process.exit(1);
  }

  const filepath = path.resolve(ROOT, file);
  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(filepath);
  let json: string;
  try {
    json = gunzipSync(buffer).toString("utf-8");
  } catch {
    console.error("Failed to decompress file — is it a valid .json.gz backup?");
    process.exit(1);
  }

  let parsed: { collections: Record<string, unknown[]> };
  try {
    parsed = JSON.parse(json);
  } catch {
    console.error("Failed to parse JSON in backup file.");
    process.exit(1);
  }

  if (!parsed?.collections || typeof parsed.collections !== "object") {
    console.error("Invalid backup format — missing 'collections' key.");
    process.exit(1);
  }

  await connect();
  const db = mongoose.connection.db!;
  const colEntries = Object.entries(parsed.collections);

  console.log(`Restoring ${colEntries.length} collection(s)…`);

  for (const [colName, docs] of colEntries) {
    if (!Array.isArray(docs)) continue;
    const col = db.collection(colName);
    await col.deleteMany({});
    if (docs.length > 0) {
      await col.insertMany(docs as mongoose.mongo.OptionalId<mongoose.mongo.Document>[], { ordered: false });
    }
    console.log(`  ${colName}: restored ${docs.length} document(s)`);
  }

  console.log("\nRestore complete.");
  await mongoose.disconnect();
}

// ── list ─────────────────────────────────────────────────────────────────────

function list() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(`No backups directory found at ${BACKUP_DIR}`);
    return;
  }

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".json.gz"))
    .map((f) => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      return { name: f, size: stats.size, created: stats.birthtime };
    })
    .sort((a, b) => b.created.getTime() - a.created.getTime());

  if (files.length === 0) {
    console.log("No backups found.");
    return;
  }

  console.log(`Backups in ${BACKUP_DIR}:\n`);
  for (const f of files) {
    const kb = (f.size / 1024).toFixed(1).padStart(8);
    const date = f.created.toLocaleString();
    console.log(`  ${kb} KB   ${date}   ${f.name}`);
  }
}

// ── entry ────────────────────────────────────────────────────────────────────

const command = process.argv[2];

if (command === "restore") {
  restore()
    .then(() => process.exit(0))
    .catch((err) => { console.error("Restore failed:", err); process.exit(1); });
} else if (command === "list") {
  list();
} else {
  // default: backup
  backup()
    .then(() => process.exit(0))
    .catch((err) => { console.error("Backup failed:", err); process.exit(1); });
}
