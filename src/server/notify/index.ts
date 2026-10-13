import { getRedis } from "@/lib/redis";
import { telegramChannel } from "@/server/notify/telegram";
import type { BossReadyNotice, NotifyChannel } from "@/server/notify/types";

const channels: NotifyChannel[] = [telegramChannel];
const CLAIM_SEC = 8;
/** Cover the full wait+ready window so a successful send is not repeated for the same clock. */
const READY_REMEMBER_SEC = 3 * 60 * 60;
const HOUR_SOON_REMEMBER_SEC = 10 * 60;
const memoryClaim = new Map<string, number>();
let missingChannelWarned = false;

async function claim(key: string, seconds: number): Promise<boolean> {
  const redis = await getRedis();
  if (redis) {
    try {
      const got = await redis.set(key, "1", { NX: true, EX: seconds });
      return got === "OK";
    } catch (error) {
      console.error(
        "notify claim",
        error instanceof Error ? error.message : "failed",
      );
    }
  }

  const now = Date.now();
  const until = memoryClaim.get(key) ?? 0;
  if (until > now) return false;
  memoryClaim.set(key, now + seconds * 1000);
  return true;
}

async function claimed(key: string): Promise<boolean> {
  const redis = await getRedis();
  if (redis) {
    try {
      return (await redis.get(key)) != null;
    } catch (error) {
      console.error(
        "notify claim",
        error instanceof Error ? error.message : "failed",
      );
    }
  }
  return (memoryClaim.get(key) ?? 0) > Date.now();
}

async function remember(key: string, seconds: number): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(key, "1", { EX: seconds });
      return;
    } catch (error) {
      console.error(
        "notify claim",
        error instanceof Error ? error.message : "failed",
      );
    }
  }
  memoryClaim.set(key, Date.now() + seconds * 1000);
}

async function activeChannels(): Promise<NotifyChannel[] | null> {
  const active = [];
  let enabled = false;
  for (const channel of channels) {
    if (!channel.enabled()) continue;
    enabled = true;
    if (!(await channel.available())) continue;
    active.push(channel);
  }
  if (active.length === 0) {
    if (!missingChannelWarned) {
      missingChannelWarned = true;
      console.error(
        enabled
          ? "notify skipped: no chat"
          : "notify skipped: no channel configured",
      );
    }
    return null;
  }
  return active;
}

/**
 * Tell every enabled channel that wait → ready just happened.
 * One successful send per boss clock; failed sends can retry.
 */
export async function notifyBossReady(
  bossId: string,
  clockKey: string,
  notice: BossReadyNotice,
): Promise<boolean> {
  const doneKey = `g2:notify:boss-ready:${bossId}:${clockKey}`;
  if (await claimed(doneKey)) return true;
  if (!(await claim(`${doneKey}:lock`, CLAIM_SEC))) return false;
  const active = await activeChannels();
  if (!active) return false;

  const delivered = await Promise.all(
    active.map(async (channel) => {
      try {
        return await channel.sendBossReady(notice);
      } catch (error) {
        console.error(
          `notify ${channel.id}`,
          error instanceof Error ? error.message : "failed",
        );
        return false;
      }
    }),
  );
  if (!delivered.some(Boolean)) return false;
  await remember(doneKey, READY_REMEMBER_SEC);
  return true;
}

/** Yellow warning that รอเกิด has five minutes left. One send per stored clock. */
export async function notifyBossHourSoon(
  bossId: string,
  clockKey: string,
  notice: BossReadyNotice,
): Promise<boolean> {
  const doneKey = `g2:notify:boss-hour-soon:${bossId}:${clockKey}`;
  if (await claimed(doneKey)) return true;
  if (!(await claim(`${doneKey}:lock`, CLAIM_SEC))) return false;
  const active = await activeChannels();
  if (!active) return false;

  const delivered = await Promise.all(
    active.map(async (channel) => {
      try {
        return await channel.sendBossHourSoon(notice);
      } catch (error) {
        console.error(
          `notify ${channel.id}`,
          error instanceof Error ? error.message : "failed",
        );
        return false;
      }
    }),
  );
  if (!delivered.some(Boolean)) return false;
  await remember(doneKey, HOUR_SOON_REMEMBER_SEC);
  return true;
}
