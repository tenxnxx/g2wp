import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function readPoolMax(): number {
  const raw = Number(process.env.DATABASE_POOL_MAX ?? 5);
  if (!Number.isInteger(raw) || raw < 1) return 5;
  return Math.min(raw, 20);
}

function isConnectTimeout(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout exceeded when trying to connect|Connection terminated|ECONNREFUSED|ECONNRESET/i.test(
    message,
  );
}

/** Bump this whenever prisma/schema.prisma models/fields change (dev hot-reload). */
const PRISMA_SCHEMA_VERSION = 30;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
  prismaWarm?: Promise<void>;
  prismaReconnect?: Promise<void>;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const isDev = process.env.NODE_ENV === "development";
  const adapter = new PrismaPg({
    connectionString,
    max: readPoolMax(),
    // Docker Desktop on Windows can need more than 5s after a hard process kill.
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: !isDev,
  });
  return new PrismaClient({ adapter });
}

function warmClient(client: PrismaClient) {
  globalForPrisma.prismaWarm = client.$queryRaw`SELECT 1`
    .then(() => undefined)
    .catch((error: unknown) => {
      console.error(
        "prisma warm",
        error instanceof Error ? error.message : "failed",
      );
    })
    .finally(() => {
      if (globalForPrisma.prisma === client) {
        globalForPrisma.prismaWarm = undefined;
      }
    });
}

function getPrismaClient() {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION
  ) {
    return globalForPrisma.prisma;
  }

  const previous = globalForPrisma.prisma;
  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  warmClient(client);

  if (previous) {
    void previous.$disconnect().catch(() => undefined);
  }

  return client;
}

async function resetPrismaClient() {
  if (globalForPrisma.prismaReconnect) {
    await globalForPrisma.prismaReconnect;
    return;
  }

  globalForPrisma.prismaReconnect = (async () => {
    const previous = globalForPrisma.prisma;
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaSchemaVersion = undefined;
    globalForPrisma.prismaWarm = undefined;
    if (previous) {
      await previous.$disconnect().catch(() => undefined);
    }
    getPrismaClient();
  })().finally(() => {
    globalForPrisma.prismaReconnect = undefined;
  });

  await globalForPrisma.prismaReconnect;
}

/** Run a DB call; on a dead/timed-out pool, rebuild once and retry. */
export async function withDbRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    if (globalForPrisma.prismaWarm) await globalForPrisma.prismaWarm;
    return await run();
  } catch (error) {
    if (!isConnectTimeout(error)) throw error;
    console.error(
      "prisma reconnect",
      error instanceof Error ? error.message : "timeout",
    );
    await resetPrismaClient();
    if (globalForPrisma.prismaWarm) await globalForPrisma.prismaWarm;
    return await run();
  }
}

export const prisma = getPrismaClient();
