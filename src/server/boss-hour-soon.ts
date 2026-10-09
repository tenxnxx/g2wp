import {
  bossHourAlmostDone,
  bossInclude,
  formatBossTime,
  readBoardLane,
} from "@/lib/bosses";
import { prisma } from "@/lib/db";
import { notifyBossHourSoon } from "@/server/notify";
import { TYPE_SERVER_LABEL } from "@/types/type-server";

type WatchGlobal = typeof globalThis & {
  bossHourSoonStarted?: boolean;
};

let scanning = false;

/** Sends the five-minute warning from the server, so a closed board tab still notifies. */
async function scanBossHourSoon(): Promise<void> {
  if (scanning) return;
  scanning = true;
  try {
    const rows = await prisma.boss.findMany({
      where: { hour: { not: null }, minute: { not: null } },
      include: bossInclude,
    });
    const now = Date.now();
    for (const boss of rows) {
      const lane = readBoardLane(boss.boardLane);
      if (
        boss.hour == null ||
        boss.minute == null ||
        !bossHourAlmostDone(
          { hour: boss.hour, minute: boss.minute, second: boss.second, boardLane: lane },
          now,
        )
      ) {
        continue;
      }
      await notifyBossHourSoon(
        boss.id,
        `${boss.hour}:${boss.minute}:${boss.second ?? 0}`,
        {
          cityName: boss.city.cityName,
          serverName: boss.server.serverName,
          typeLabel: TYPE_SERVER_LABEL[boss.typeServer.type],
          clock: formatBossTime(boss.hour, boss.minute, boss.second ?? undefined),
        },
      );
    }
  } finally {
    scanning = false;
  }
}

export function startBossHourSoonWatch(): void {
  const g = globalThis as WatchGlobal;
  if (g.bossHourSoonStarted) return;
  g.bossHourSoonStarted = true;

  const timer = setInterval(() => {
    void scanBossHourSoon().catch((error: unknown) => {
      console.error(
        "hour soon watch",
        error instanceof Error ? error.message : "failed",
      );
    });
  }, 15_000);
  timer.unref();
  void scanBossHourSoon().catch((error: unknown) => {
    console.error(
      "hour soon watch",
      error instanceof Error ? error.message : "failed",
    );
  });
}
