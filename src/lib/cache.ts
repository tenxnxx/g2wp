import { after } from "next/server";
import { isLiveTopic, type LivePayload } from "@/lib/live";
import { getRedis } from "@/lib/redis";

/** Lazy import avoids Turbopack HMR leaving a stale `withDbRetry` binding as undefined. */
async function loadDb<T>(load: () => Promise<T>): Promise<T> {
  const { withDbRetry } = await import("@/lib/db");
  if (typeof withDbRetry !== "function") return load();
  return withDbRetry(load);
}

/** v2 stores gen fingerprints so orphan keys cannot serve stale JSON after invalidate. */
const PREFIX = "g2:c:v2:";

export const CACHE_TTL = {
  list: 30,
  detail: 30,
  board: 15,
  dashboard: 20,
  publicOptions: 60,
} as const;

/** Extra tags cleared when a resource is written, so related pages stay fresh. */
const FALLOUT: Record<string, readonly string[]> = {
  members: ["members", "dashboard", "report-options", "teams"],
  groups: ["groups", "members"],
  players: ["players", "members", "dashboard", "teams", "report-options"],
  items: ["items", "safes"],
  safes: ["safes"],
  bosses: ["bosses"],
  cities: ["cities", "bosses"],
  servers: ["servers", "bosses"],
  "type-servers": ["type-servers", "bosses"],
  behaviors: ["behaviors", "dashboard", "reports"],
  reports: ["reports"],
  "set-dates": ["set-dates"],
  "check-events": ["check-events"],
  users: ["users"],
  teams: ["teams"],
};

export function cacheKey(path: string, searchParams: URLSearchParams, scope = ""): string {
  const entries = [...searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const query = new URLSearchParams(entries).toString();
  return scope ? `${path}?${query}&scope=${scope}` : `${path}?${query}`;
}

type Redis = NonNullable<Awaited<ReturnType<typeof getRedis>>>;

type CacheEnvelope<T> = { d: T; g: string[] };

function genKey(tag: string) {
  return `${PREFIX}gen:${tag}`;
}

function tagKey(tag: string) {
  return `${PREFIX}tag:${tag}`;
}

const STORE_IF_GEN = `
local n = tonumber(ARGV[1])
for i = 1, n do
  local gen = redis.call('GET', KEYS[i])
  if not gen then gen = '0' end
  if gen ~= ARGV[i + 1] then
    return 0
  end
end
local dataKey = KEYS[n + 1]
redis.call('SET', dataKey, ARGV[n + 2], 'EX', tonumber(ARGV[n + 3]))
local tagTtl = tonumber(ARGV[n + 4])
for i = 1, n do
  local setKey = KEYS[n + 1 + i]
  redis.call('SADD', setKey, dataKey)
  redis.call('EXPIRE', setKey, tagTtl)
end
return 1
`;

const UNLOCK = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function currentGens(redis: Redis, tags: readonly string[]): Promise<string[]> {
  return Promise.all(tags.map(async (tag) => (await redis.get(genKey(tag))) ?? "0"));
}

function gensMatch(stored: unknown, current: string[]): boolean {
  if (!Array.isArray(stored) || stored.length !== current.length) return false;
  return stored.every((gen, i) => gen === current[i]);
}

async function readCached<T>(
  redis: Redis,
  fullKey: string,
  tags: readonly string[],
): Promise<{ hit: true; value: T } | { hit: false }> {
  const raw = await redis.get(fullKey);
  if (raw == null) return { hit: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await redis.del(fullKey).catch(() => undefined);
    return { hit: false };
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("d" in parsed) ||
    !("g" in parsed)
  ) {
    // Legacy bare JSON (v1) — drop so the next write stores an envelope.
    await redis.del(fullKey).catch(() => undefined);
    return { hit: false };
  }

  const envelope = parsed as CacheEnvelope<T>;
  const gens = await currentGens(redis, tags);
  if (!gensMatch(envelope.g, gens)) {
    await redis.del(fullKey).catch(() => undefined);
    return { hit: false };
  }
  return { hit: true, value: envelope.d };
}

async function waitCached<T>(
  redis: Redis,
  fullKey: string,
  tags: readonly string[],
): Promise<{ hit: true; value: T } | { hit: false }> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await sleep(80);
    const cached = await readCached<T>(redis, fullKey, tags);
    if (cached.hit) return cached;
  }
  return { hit: false };
}

/**
 * Return a cached JSON value, or run `load` and store it.
 * A thrown `load` is not cached. If Redis is down, `load` still runs.
 */
export async function remember<T>(
  key: string,
  tags: readonly string[],
  ttlSec: number,
  load: () => Promise<T>,
): Promise<T> {
  const redis = await getRedis();
  const fullKey = PREFIX + key;

  if (!redis) return loadDb(load);

  try {
    const cached = await readCached<T>(redis, fullKey, tags);
    if (cached.hit) return cached.value;
  } catch (error) {
    console.error("cache read", error instanceof Error ? error.message : error);
    return loadDb(load);
  }

  const lockKey = `${fullKey}:lock`;
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  let locked = false;
  try {
    let expected = tags.map(() => "0");
    try {
      const got = await redis.set(lockKey, token, { NX: true, EX: 8 });
      locked = got === "OK";
      if (!locked) {
        const waited = await waitCached<T>(redis, fullKey, tags);
        if (waited.hit) return waited.value;
      }
      expected = await currentGens(redis, tags);
    } catch (error) {
      console.error("cache read", error instanceof Error ? error.message : error);
      return loadDb(load);
    }

    const value = await loadDb(load);
    try {
      const envelope: CacheEnvelope<T> = { d: value, g: expected };
      const payload = JSON.stringify(envelope);
      const tagTtl = String(Math.max(ttlSec, 120));
      await redis.eval(STORE_IF_GEN, {
        keys: [...tags.map(genKey), fullKey, ...tags.map(tagKey)],
        arguments: [String(tags.length), ...expected, payload, String(ttlSec), tagTtl],
      });
    } catch (error) {
      console.error("cache write", error instanceof Error ? error.message : error);
    }
    return value;
  } finally {
    if (locked) {
      await redis.eval(UNLOCK, { keys: [lockKey], arguments: [token] }).catch(() => undefined);
    }
  }
}

type InvalidateLive = false | "topics" | LivePayload;

function publishLive(tags: readonly string[], live: InvalidateLive) {
  if (live === false) return;
  const run = async () => {
    const pub = await import("@/server/live-publish");
    if (live === "topics") {
      await pub.publishLiveTopics(tags.filter(isLiveTopic));
      return;
    }
    if (live.boss) {
      await pub.publishLiveBossPatch(live.boss);
      return;
    }
    if (live.removedId) {
      await pub.publishLiveBossRemoved(live.removedId);
      return;
    }
    await pub.publishLiveTopics([live.topic]);
  };
  try {
    after(run);
  } catch {
    void run();
  }
}

export async function invalidateTags(
  tags: readonly string[],
  live: InvalidateLive = "topics",
): Promise<void> {
  if (tags.length === 0) return;
  publishLive(tags, live);
  const redis = await getRedis();
  if (!redis) return;

  try {
    for (const tag of tags) {
      const setKey = tagKey(tag);
      const keys = await redis.sMembers(setKey);
      const multi = redis.multi();
      multi.incr(genKey(tag));
      if (keys.length > 0) multi.del(keys);
      multi.del(setKey);
      await multi.exec();
    }
  } catch (error) {
    console.error("cache invalidate", error instanceof Error ? error.message : error);
  }
}

/** Clear this resource and the pages that display its data. */
export async function invalidateResource(...resources: string[]): Promise<void> {
  const tags = new Set<string>();
  for (const resource of resources) {
    for (const tag of FALLOUT[resource] ?? [resource]) tags.add(tag);
  }
  await invalidateTags([...tags], "topics");
}

/** Invalidate boss list cache and push a single-row live patch (no full board refetch). */
export async function invalidateBossesWithPatch(
  boss: NonNullable<LivePayload["boss"]>,
): Promise<void> {
  await invalidateTags(["bosses"], { topic: "bosses", boss });
}

export async function invalidateBossesRemoved(removedId: string): Promise<void> {
  await invalidateTags(["bosses"], { topic: "bosses", removedId });
}
