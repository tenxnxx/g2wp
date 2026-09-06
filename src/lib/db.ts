import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Bump this whenever prisma/schema.prisma models/fields change (dev hot-reload). */
const PRISMA_SCHEMA_VERSION = 17;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION
  ) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();
  // Cache on globalThis for warm serverless / HMR reuse
  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  return client;
}

export const prisma = getPrismaClient();
