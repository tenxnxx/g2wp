import { createClient } from "redis";

type Redis = ReturnType<typeof createClient>;

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
  redisRetryAt?: number;
};

const RETRY_MS = 15_000;

/** Shared Redis client. Returns null when REDIS_URL is unset or Redis is unreachable. */
export async function getRedis(): Promise<Redis | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  const existing = globalForRedis.redis;
  if (existing?.isOpen) return existing;

  const retryAt = globalForRedis.redisRetryAt ?? 0;
  if (Date.now() < retryAt) return null;

  try {
    if (existing) {
      existing.removeAllListeners();
      await existing.disconnect().catch(() => undefined);
    }

    const client = createClient({
      url,
      socket: {
        connectTimeout: 2_000,
        reconnectStrategy: (retries) => (retries > 2 ? false : retries * 200),
      },
    });
    client.on("error", (error) => {
      console.error("redis", error instanceof Error ? error.message : error);
    });
    await client.connect();
    globalForRedis.redis = client;
    globalForRedis.redisRetryAt = 0;
    return client;
  } catch (error) {
    globalForRedis.redis = undefined;
    globalForRedis.redisRetryAt = Date.now() + RETRY_MS;
    console.error(
      "redis connect",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
