/**
 * Rate limiter: REDIS_URL when configured, else Upstash Redis REST, else in-memory.
 *
 * Env (optional):
 *   REDIS_URL
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import { getRedis } from "@/lib/redis";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number; retryAfterSec: number };

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

const RATE_WINDOW = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

async function redisRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const redis = await getRedis();
  if (!redis) return null;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `g2:rl:${key}`;

  try {
    const raw = await redis.eval(RATE_WINDOW, {
      keys: [redisKey],
      arguments: [String(windowSec)],
    });
    const pair = Array.isArray(raw) ? raw : [];
    const count = Number(pair[0] ?? 0);
    const ttl = Number(pair[1] ?? windowSec);
    const retryAfterSec = ttl > 0 ? ttl : windowSec;
    const resetAt = Date.now() + retryAfterSec * 1000;

    if (count > limit) {
      return {
        ok: false,
        remaining: 0,
        resetAt,
        retryAfterSec: Math.max(1, retryAfterSec),
      };
    }

    return {
      ok: true,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  } catch {
    return null;
  }
}

async function upstashRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const base = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `rl:${key}`;

  try {
    const res = await fetch(`${base}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSec, "NX"],
        ["TTL", redisKey],
      ]),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ result: number }>;
    const count = Number(data[0]?.result ?? 0);
    const ttl = Number(data[2]?.result ?? windowSec);
    const retryAfterSec = ttl > 0 ? ttl : windowSec;
    const resetAt = Date.now() + retryAfterSec * 1000;

    if (count > limit) {
      return {
        ok: false,
        remaining: 0,
        resetAt,
        retryAfterSec: Math.max(1, retryAfterSec),
      };
    }

    return {
      ok: true,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  } catch {
    return null;
  }
}

/** Prefer REDIS_URL, then Upstash, then in-memory. */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const direct = await redisRateLimit(key, limit, windowMs);
  if (direct) return direct;
  const remote = await upstashRateLimit(key, limit, windowMs);
  if (remote) return remote;
  return memoryRateLimit(key, limit, windowMs);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

const CLEAN_EVERY = 200;
let ops = 0;
export function maybeSweepRateLimits() {
  ops += 1;
  if (ops % CLEAN_EVERY !== 0) return;
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
