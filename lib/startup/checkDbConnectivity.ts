import logger from "@/lib/logger";
import { connectDB } from "@/lib/db/connect";

/** Ping MongoDB at startup; crash with a clear message on failure. */
export async function checkDbConnectivity(): Promise<void> {
  try {
    const mongoose = await connectDB();
    await mongoose.connection.db?.command({ ping: 1 });
    logger.info("MongoDB connectivity check passed");
  } catch (err) {
    logger.fatal({ err }, "MongoDB connectivity check failed — server will not start");
    throw new Error(
      `Cannot connect to MongoDB: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
