import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function readPoolMax(): number {
  const raw = Number(process.env.DATABASE_POOL_MAX ?? 5);
  if (!Number.isInteger(raw) || raw < 1) return 5;
  return Math.min(raw, 20);
}

/** Bump this whenever prisma/schema.prisma models/fields change (dev hot-reload). */
const PRISMA_SCHEMA_VERSION = 30;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({
    connectionString,
    max: readPoolMax(),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION
  ) {
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect();
  }

  const client = createPrismaClient();
  // Cache on globalThis for warm serverless / HMR reuse
  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  return client;
}

export const prisma = getPrismaClient();
