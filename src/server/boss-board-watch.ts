import {
  bossHourAlmostDone,
  bossInclude,
  bossTimeGroup,
  formatBossTime,
  readBoardLane,
} from "@/lib/bosses";
import { invalidateResource } from "@/lib/cache";
import { prisma } from "@/lib/db";
import {
  listNotifyChannelStatus,
  notifyBossHourSoon,
  notifyBossReady,
} from "@/server/notify";
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

async function notifyAllHourSoon(bosses: TimedBoss[]): Promise<void> {
  for (const boss of bosses) {
    try {
      await notifyBossHourSoon(boss.id, clockKey(boss), noticeOf(boss));
    } catch (error: unknown) {
      console.error(
        "boss hour-soon",
        error instanceof Error ? error.message : "failed",
      );
    }
  }
}

async function notifyAllReady(bosses: TimedBoss[]): Promise<void> {
  for (const boss of bosses) {
    try {
      await notifyBossReady(boss.id, clockKey(boss), noticeOf(boss));
    } catch (error: unknown) {
      console.error(
        "boss ready",
        error instanceof Error ? error.message : "failed",
      );
    }
  }
}

/**
 * One scan for: yellow 5-minute warning, wait→ready (+ 🟢 notify),
 * missed ready window (notify then clear), and ready→not (no notify).
 */
async function scanBossBoard(): Promise<void> {
  const rows = await loadTimedBosses();
  const now = Date.now();
  let boardChanged = false;

  const hourSoon: TimedBoss[] = [];
  const promote: TimedBoss[] = [];
  const readyNotify: TimedBoss[] = [];
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

    // Already in เกิดแล้ว: keep trying 🟢 until Redis remembers a successful send.
    if (group === "upcoming") readyNotify.push(boss);
    if (group === "over") clearReady.push(boss);
  }

  await notifyAllHourSoon(hourSoon);

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

  const readyNotifyIds = new Set(readyNotify.map((boss) => boss.id));
  const readyToNotify = [
    ...promotedRows.filter((boss) => !readyNotifyIds.has(boss.id)),
    ...readyNotify,
  ];
  await notifyAllReady(readyToNotify);

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
}

/** Cron / scheduled ping entry. Skips when another scan is already running. */
export async function runBossBoardScan(): Promise<"ran" | "busy"> {
  if (scanning) return "busy";
  scanning = true;
  try {
    await scanBossBoard();
    return "ran";
  } finally {
    scanning = false;
  }
}

function shouldUseLocalInterval(): boolean {
  if (process.env.BOSS_BOARD_WATCH_INTERVAL === "0") return false;
  // Serverless hosts freeze timers; long-lived hosts (Render Web Service, local) keep the loop.
  if (process.env.NETLIFY === "true") return false;
  return true;
}

export function startBossBoardWatch(): void {
  const g = globalThis as WatchGlobal;
  if (g.bossBoardWatchStarted) return;
  g.bossBoardWatchStarted = true;

  void listNotifyChannelStatus()
    .then((rows) => {
      console.log(
        "boss board watch notify",
        rows
          .map(
            (row) =>
              `${row.id}:${row.enabled ? (row.available ? "on" : "bad-config") : "off"}`,
          )
          .join(" "),
      );
    })
    .catch(() => {
      /* ignore */
    });

  void runBossBoardScan().catch((error: unknown) => {
    console.error(
      "boss board watch",
      error instanceof Error ? error.message : "failed",
    );
  });

  if (!shouldUseLocalInterval()) return;

  const timer = setInterval(() => {
    void runBossBoardScan().catch((error: unknown) => {
      console.error(
        "boss board watch",
        error instanceof Error ? error.message : "failed",
      );
    });
  }, 15_000);
  timer.unref();
}
