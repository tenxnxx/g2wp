import type { Boss, BossBoardLane } from "@/types/boss";
import type { TypeServerKind } from "@/types/type-server";

/** Hour is 0–23 and minute is 0–59. Anything else is rejected. */
export function readClockValue(value: unknown, max: number): number | null {
  let parsed = value;
  if (typeof parsed === "string" && parsed.trim() !== "") {
    if (!/^\d+$/.test(parsed.trim())) return null;
    parsed = Number(parsed);
  }
  if (typeof parsed !== "number" || !Number.isInteger(parsed)) return null;
  if (parsed < 0 || parsed > max) return null;
  return parsed;
}

export function formatBossTime(hour: number, minute: number, second?: number): string {
  const clock = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  if (second === undefined) return clock;
  return `${clock}:${String(second).padStart(2, "0")}`;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

/** รอเกิด is the hour before the clock. เกิดแล้ว lasts one hour, then the card moves to ไม่พบบอส. */
const BOSS_WINDOW_MS = ONE_HOUR_MS;
const FINISHED_HOLD_MS = ONE_HOUR_MS;

export const bossWindowCopy = {
  overTitle: "ไม่พบบอส",
  freshTitle: "รอเกิด",
  upcomingTitle: "เกิดแล้ว",
};

/** Clock time on today's local date, so a stored 13:03 means today at 13:03. */
export function bossSelectedAt(
  hour: number,
  minute: number,
  second = 0,
  now = Date.now(),
): number {
  const day = new Date(now);
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hour,
    minute,
    second,
    0,
  ).getTime();
}

export function bossElapsedMs(
  boss: { hour: number; minute: number; second?: number | null },
  now = Date.now(),
): number {
  return now - bossSelectedAt(boss.hour, boss.minute, boss.second ?? 0, now);
}

/** Clock that belongs in a column at this moment. The card's time and status follow it. */
export function clockForGroup(
  group: BossTimeGroup,
  now = Date.now(),
): { hour: number; minute: number; second: number } {
  const offsetMs =
    group === "fresh"
      ? BOSS_WINDOW_MS - 1000
      : group === "upcoming"
        ? -1_000
        : 2 * ONE_HOUR_MS;
  const target = new Date(now + offsetMs);
  return {
    hour: target.getHours(),
    minute: target.getMinutes(),
    second: target.getSeconds(),
  };
}

export type BossTimeGroup = "over" | "fresh" | "upcoming";

/** Box 1 is not, box 2 is wait, box 3 is ready. */
export const BOSS_BOX_STATUS: Record<BossTimeGroup, BossBoardLane> = {
  over: "not",
  fresh: "wait",
  upcoming: "ready",
};

const LANE_GROUP: Record<BossBoardLane, BossTimeGroup> = {
  not: "over",
  wait: "fresh",
  ready: "upcoming",
};

export function readBoardLane(value: unknown): BossBoardLane | null {
  if (value === "not" || value === "wait" || value === "ready") return value;
  return null;
}

/**
 * Box 2 is the hour before the chosen time, then the row moves to box 3.
 * Box 3 lasts one hour, then the row moves to box 1.
 * Wait and ready recapture the clock. ไม่พบบอส clears it.
 * A card in box 1 stays there until someone moves it.
 * A wait pin whose time has arrived always reads as ready, so the
 * board recaptures a ready clock instead of skipping that column.
 * A ready pin expires with that hold.
 */
export function bossTimeGroup(
  boss: {
    hour: number | null;
    minute: number | null;
    second?: number | null;
    boardLane?: BossBoardLane | null;
  },
  now = Date.now(),
): BossTimeGroup {
  if (boss.hour == null || boss.minute == null) {
    if (boss.boardLane === "wait") return "fresh";
    if (boss.boardLane === "ready") return "upcoming";
    return "over";
  }
  const elapsed = bossElapsedMs(
    { hour: boss.hour, minute: boss.minute, second: boss.second },
    now,
  );
  const holdExpired = elapsed >= FINISHED_HOLD_MS;
  if (boss.boardLane === "not") return "over";
  if (boss.boardLane === "wait" && elapsed >= 0) return "upcoming";
  if (boss.boardLane === "ready" && holdExpired) return "over";
  if (boss.boardLane) return LANE_GROUP[boss.boardLane];
  if (elapsed >= 0) {
    if (holdExpired) return "over";
    return "upcoming";
  }
  if (elapsed >= -BOSS_WINDOW_MS) return "fresh";
  return "over";
}

export function formatBossElapsed(elapsedMs: number): string {
  const ahead = elapsedMs < 0;
  const totalSeconds = Math.floor(Math.abs(elapsedMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const body =
    hours === 0
      ? `${minutes} นาที ${seconds} วิ`
      : `${hours} ชม. ${String(minutes).padStart(2, "0")} นาที ${seconds} วิ`;
  return ahead ? `อีก ${body}` : `ผ่านมา ${body}`;
}

export const bossInclude = {
  city: { select: { cityName: true } },
  server: { select: { serverName: true } },
  typeServer: { select: { type: true } },
} as const;

export function serializeBoss(row: {
  id: string;
  cityId: string;
  serverId: string;
  typeServerId: string;
  hour: number | null;
  minute: number | null;
  second: number | null;
  boardLane: string | null;
  createBy: string;
  updateBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  city: { cityName: string };
  server: { serverName: string };
  typeServer: { type: TypeServerKind };
}): Boss {
  return {
    id: row.id,
    cityId: row.cityId,
    cityName: row.city.cityName,
    serverId: row.serverId,
    serverName: row.server.serverName,
    typeServerId: row.typeServerId,
    type: row.typeServer.type,
    hour: row.hour,
    minute: row.minute,
    second: row.second,
    boardLane: readBoardLane(row.boardLane),
    createBy: row.createBy,
    updateBy: row.updateBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
