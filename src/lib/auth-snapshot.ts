import type { User } from "@supabase/supabase-js";

/** Short memory cache so proxy and API handlers skip a repeat Supabase round trip. */
const TTL_MS = 15_000;
const MAX_ENTRIES = 400;

type Entry = { user: User; at: number };

const snapshots = new Map<string, Entry>();

/** Stable key from the Supabase auth cookies only. Other cookies must not bust it. */
export function authCookieKey(cookies: { name: string; value: string }[]): string {
  return cookies
    .filter((cookie) => cookie.name.includes("-auth-token"))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .sort()
    .join("\n");
}

export function readAuthSnapshot(key: string): User | null {
  if (!key) return null;
  const entry = snapshots.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    snapshots.delete(key);
    return null;
  }
  return entry.user;
}

export function writeAuthSnapshot(key: string, user: User) {
  if (!key) return;
  snapshots.set(key, { user, at: Date.now() });
  if (snapshots.size <= MAX_ENTRIES) return;
  const oldest = snapshots.keys().next().value;
  if (oldest) snapshots.delete(oldest);
}
