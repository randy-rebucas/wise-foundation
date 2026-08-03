import logger from "@/lib/logger";
import { prisma } from "@/lib/db/prisma";

/** Ping Postgres at startup; crash with a clear message on failure. */
export async function checkDbConnectivity(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Postgres connectivity check passed");
  } catch (err) {
    logger.fatal({ err }, "Postgres connectivity check failed — server will not start");
    throw new Error(
      `Cannot connect to Postgres: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
