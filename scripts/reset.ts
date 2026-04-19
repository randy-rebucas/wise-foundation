import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env.local");
  process.exit(1);
}

async function reset() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected.\n");

  const db = mongoose.connection.db!;
  const cols = await db.listCollections().toArray();

  if (cols.length === 0) {
    console.log("Nothing to drop — database is already empty.");
  } else {
    console.log(`Dropping ${cols.length} collection(s)…`);
    for (const col of cols) {
      await db.collection(col.name).drop();
      console.log(`  dropped: ${col.name}`);
    }
    console.log("\nDatabase reset complete.");
  }

  await mongoose.disconnect();
  process.exit(0);
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
