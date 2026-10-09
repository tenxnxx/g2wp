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

/** รอเกิด lasts one hour after the clock. เกิดแล้ว lasts the next hour, then the card moves to ไม่พบบอส. */
const BOSS_WINDOW_MS = ONE_HOUR_MS;
const FINISHED_HOLD_MS = ONE_HOUR_MS;
/** The first half of เกิดแล้ว still counts down. The rest is marked late. */
const READY_EARLY_MS = 30 * 60 * 1000;
/** Warn once while รอเกิด still has this much of its hour left. */
const HOUR_SOON_MS = 5 * 60 * 1000;

export const bossWindowCopy = {
  overTitle: "ไม่พบบอส",
  freshTitle: "รอเกิด",
  upcomingTitle: "เกิดแล้ว",
};

/** Thailand has no daylight saving. Stored clocks are wall time in this zone. */
const BOARD_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Clock time on today's date in Thailand, so a stored 13:03 means 13:03 ICT on any server. */
export function bossSelectedAt(
  hour: number,
  minute: number,
  second = 0,
  now = Date.now(),
): number {
  const board = new Date(now + BOARD_UTC_OFFSET_MS);
  return Date.UTC(
    board.getUTCFullYear(),
    board.getUTCMonth(),
    board.getUTCDate(),
    hour - 7,
    minute,
    second,
    0,
  );
}

export function bossElapsedMs(
  boss: { hour: number; minute: number; second?: number | null },
  now = Date.now(),
): number {
  return now - bossSelectedAt(boss.hour, boss.minute, boss.second ?? 0, now);
}

/** A manual drop stores a clock that the set-time comparison places in that column. */
export function clockForGroup(
  group: BossTimeGroup,
  now = Date.now(),
): { hour: number; minute: number; second: number } {
  const offsetMs =
    group === "fresh"
      ? 0
      : group === "upcoming"
        ? -(BOSS_WINDOW_MS + 1000)
        : 2 * ONE_HOUR_MS;
  const target = new Date(now + offsetMs);
  return {
    hour: target.getHours(),
    minute: target.getMinutes(),
    second: target.getSeconds(),
  };
}

/** A new boss starts in รอเกิด at the chosen time. That time is the start of the wait hour. */
export function clockForNewBoss(
  hour: number,
  minute: number,
): { hour: number; minute: number; second: number } {
  return { hour, minute, second: 0 };
}

export type BossTimeGroup = "over" | "fresh" | "upcoming";

/** Box 1 is not, box 2 is wait, box 3 is ready. */
export const BOSS_BOX_STATUS: Record<BossTimeGroup, BossBoardLane> = {
  over: "not",
  fresh: "wait",
  upcoming: "ready",
};

export function readBoardLane(value: unknown): BossBoardLane | null {
  if (value === "not" || value === "wait" || value === "ready") return value;
  return null;
}

/**
 * The column is the set clock compared with now.
 * Less than one hour after the clock is รอเกิด, the next hour is เกิดแล้ว,
 * then ไม่พบบอส. A card already in ไม่พบบอส stays there until someone moves it.
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
  if (boss.boardLane === "not") return "over";
  const elapsed = bossElapsedMs(
    { hour: boss.hour, minute: boss.minute, second: boss.second },
    now,
  );
  if (elapsed < BOSS_WINDOW_MS) return "fresh";
  if (elapsed < BOSS_WINDOW_MS + FINISHED_HOLD_MS) return "upcoming";
  return "over";
}

/** True while รอเกิด has at most five minutes left before the hour ends. */
export function bossHourAlmostDone(
  boss: {
    hour: number | null;
    minute: number | null;
    second?: number | null;
    boardLane?: BossBoardLane | null;
  },
  now = Date.now(),
): boolean {
  if (boss.hour == null || boss.minute == null) return false;
  if (boss.boardLane === "not" || boss.boardLane === "ready") return false;
  if (bossTimeGroup(boss, now) !== "fresh") return false;
  const remaining =
    BOSS_WINDOW_MS -
    bossElapsedMs(
      { hour: boss.hour, minute: boss.minute, second: boss.second },
      now,
    );
  return remaining > 0 && remaining <= HOUR_SOON_MS;
}

function formatDurationBody(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  if (hours === 0) return `${minutes} นาที ${seconds} วิ`;
  return `${hours} ชม. ${String(minutes).padStart(2, "0")} นาที ${seconds} วิ`;
}

export type BossLaneClockTone = "early" | "late" | "plain";

/**
 * รอเกิด counts down to spawn.
 * เกิดแล้ว counts up from the moment it spawned: green for the first 30 minutes, then red.
 */
export function bossLaneClock(
  boss: {
    hour: number;
    minute: number;
    second?: number | null;
    boardLane?: BossBoardLane | null;
  },
  now = Date.now(),
): { text: string; tone: BossLaneClockTone } {
  const elapsed = bossElapsedMs(boss, now);
  const group = bossTimeGroup(boss, now);
  if (group === "upcoming") {
    const sinceReady = elapsed - BOSS_WINDOW_MS;
    return {
      text: `ผ่านมาแล้ว ${formatDurationBody(sinceReady)}`,
      tone: sinceReady < READY_EARLY_MS ? "early" : "late",
    };
  }
  if (group === "fresh") {
    // A clock still later today has not started its hour, so the countdown stays within one hour.
    const remaining = Math.min(BOSS_WINDOW_MS, Math.max(0, BOSS_WINDOW_MS - elapsed));
    return { text: `อีก ${formatDurationBody(remaining)}`, tone: "plain" };
  }
  return { text: `ผ่านมา ${formatDurationBody(elapsed)}`, tone: "plain" };
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
