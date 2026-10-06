import { getRedis } from "@/lib/redis";
import { telegramChannel } from "@/server/notify/telegram";
import type { BossReadyNotice, NotifyChannel } from "@/server/notify/types";

const channels: NotifyChannel[] = [telegramChannel];
const CLAIM_SEC = 8;
const memoryClaim = new Map<string, number>();
let missingChannelWarned = false;

async function claim(bossId: string): Promise<boolean> {
  const redis = await getRedis();
  if (redis) {
    try {
      const got = await redis.set(`g2:notify:boss-ready:${bossId}`, "1", {
        NX: true,
        EX: CLAIM_SEC,
      });
      return got === "OK";
    } catch (error) {
      console.error(
        "notify claim",
        error instanceof Error ? error.message : "failed",
      );
    }
  }

  const now = Date.now();
  const until = memoryClaim.get(bossId) ?? 0;
  if (until > now) return false;
  memoryClaim.set(bossId, now + CLAIM_SEC * 1000);
  return true;
}

/** Tell every enabled channel. A duplicate from another open board is dropped. */
export async function notifyBossReady(
  bossId: string,
  notice: BossReadyNotice,
): Promise<void> {
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
    return;
  }
  if (!(await claim(bossId))) return;

  await Promise.all(
    active.map(async (channel) => {
      try {
        await channel.sendBossReady(notice);
      } catch (error) {
        console.error(
          `notify ${channel.id}`,
          error instanceof Error ? error.message : "failed",
        );
      }
    }),
  );
}
