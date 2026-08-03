import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  var prismaClientCache: PrismaClient | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Please define the DATABASE_URL environment variable");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = global.prismaClientCache ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaClientCache = prisma;
}
