import {
  bossHourAlmostDone,
  bossInclude,
  bossTimeGroup,
  formatBossTime,
  readBoardLane,
} from "@/lib/bosses";
import { invalidateResource } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { notifyBossHourSoon, notifyBossReady } from "@/server/notify";
import { TYPE_SERVER_LABEL } from "@/types/type-server";

type WatchGlobal = typeof globalThis & {
  bossBoardWatchStarted?: boolean;
};

type BossRow = Awaited<ReturnType<typeof loadTimedBosses>>[number];
type TimedBoss = BossRow & { hour: number; minute: number };

let scanning = false;

function asTimedBoss(boss: BossRow): TimedBoss | null {
  if (boss.hour == null || boss.minute == null) return null;
  return boss as TimedBoss;
}

function clockKey(boss: TimedBoss): string {
  return `${boss.hour}:${boss.minute}:${boss.second ?? 0}`;
}

function noticeOf(boss: TimedBoss) {
  return {
    cityName: boss.city.cityName,
    serverName: boss.server.serverName,
    typeLabel: TYPE_SERVER_LABEL[boss.typeServer.type],
    clock: formatBossTime(boss.hour, boss.minute, boss.second ?? undefined),
  };
}

async function loadTimedBosses() {
  return prisma.boss.findMany({
    where: { hour: { not: null }, minute: { not: null } },
    include: bossInclude,
  });
}

/**
 * One scan for: yellow 5-minute warning, wait→ready (+ 🟢 notify),
 * missed ready window (notify then clear), and ready→not (no notify).
 * Notifies run in parallel; DB updates are batched with Promise.all.
 */
async function scanBossBoard(): Promise<void> {
  if (scanning) return;
  scanning = true;
  let boardChanged = false;
  try {
    const rows = await loadTimedBosses();
    const now = Date.now();

    const hourSoon: TimedBoss[] = [];
    const promote: TimedBoss[] = [];
    const missed: TimedBoss[] = [];
    const clearReady: TimedBoss[] = [];

    for (const row of rows) {
      const boss = asTimedBoss(row);
      if (!boss) continue;
      const lane = readBoardLane(boss.boardLane);
      const timed = {
        hour: boss.hour,
        minute: boss.minute,
        second: boss.second,
        boardLane: lane,
      };
      const group = bossTimeGroup(timed, now);

      if (bossHourAlmostDone(timed, now)) hourSoon.push(boss);
      if (lane === "not") continue;

      if (lane !== "ready") {
        if (group === "fresh") continue;
        if (group === "upcoming") promote.push(boss);
        else missed.push(boss);
        continue;
      }

      if (group === "over") clearReady.push(boss);
    }

    await Promise.all(
      hourSoon.map((boss) =>
        notifyBossHourSoon(boss.id, clockKey(boss), noticeOf(boss)).catch(
          (error: unknown) => {
            console.error(
              "boss hour-soon",
              error instanceof Error ? error.message : "failed",
            );
          },
        ),
      ),
    );

    const promoted = await Promise.all(
      promote.map(async (boss) => {
        const updated = await prisma.boss.updateMany({
          where: {
            id: boss.id,
            OR: [{ boardLane: null }, { boardLane: "wait" }],
          },
          data: { boardLane: "ready" },
        });
        return updated.count > 0 ? boss : null;
      }),
    );
    const promotedRows = promoted.filter((row): row is TimedBoss => row != null);
    if (promotedRows.length > 0) boardChanged = true;

    await Promise.all(
      promotedRows.map((boss) =>
        notifyBossReady(boss.id, clockKey(boss), noticeOf(boss)).catch(
          (error: unknown) => {
            console.error(
              "boss ready",
              error instanceof Error ? error.message : "failed",
            );
          },
        ),
      ),
    );

    const missedCleared = await Promise.all(
      missed.map(async (boss) => {
        const sent = await notifyBossReady(
          boss.id,
          clockKey(boss),
          noticeOf(boss),
        );
        if (!sent) return false;
        const cleared = await prisma.boss.updateMany({
          where: {
            id: boss.id,
            OR: [{ boardLane: null }, { boardLane: "wait" }],
          },
          data: {
            boardLane: "not",
            hour: null,
            minute: null,
            second: null,
          },
        });
        return cleared.count > 0;
      }),
    );
    if (missedCleared.some(Boolean)) boardChanged = true;

    const readyCleared = await Promise.all(
      clearReady.map(async (boss) => {
        const cleared = await prisma.boss.updateMany({
          where: { id: boss.id, boardLane: "ready" },
          data: {
            boardLane: "not",
            hour: null,
            minute: null,
            second: null,
          },
        });
        return cleared.count > 0;
      }),
    );
    if (readyCleared.some(Boolean)) boardChanged = true;

    if (boardChanged) await invalidateResource("bosses");
  } finally {
    scanning = false;
  }
}

export function startBossBoardWatch(): void {
  const g = globalThis as WatchGlobal;
  if (g.bossBoardWatchStarted) return;
  g.bossBoardWatchStarted = true;

  const timer = setInterval(() => {
    void scanBossBoard().catch((error: unknown) => {
      console.error(
        "boss board watch",
        error instanceof Error ? error.message : "failed",
      );
    });
  }, 15_000);
  timer.unref();
  void scanBossBoard().catch((error: unknown) => {
    console.error(
      "boss board watch",
      error instanceof Error ? error.message : "failed",
    );
  });
}
