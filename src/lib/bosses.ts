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
const TEN_SECONDS_MS = 10 * 1000;
const THIRTY_SECONDS_MS = 30 * 1000;

/** "trial" counts down for 10 seconds, stays finished for 30, then returns to the countdown. Set this back to "hour" to restore 1 hour. */
const BOSS_WINDOW_MODE = "trial" as "trial" | "hour";

const BOSS_WINDOW_MS = BOSS_WINDOW_MODE === "trial" ? TEN_SECONDS_MS : ONE_HOUR_MS;
const FINISHED_HOLD_MS = BOSS_WINDOW_MODE === "trial" ? THIRTY_SECONDS_MS : null;

export const bossWindowCopy =
  BOSS_WINDOW_MODE === "trial"
    ? {
        overTitle: "ไม่พบบอส",
        overHint: "ยังห่างกว่า 10 วินาที จึงยังไม่เริ่มนับ",
        freshTitle: "รอเกิด",
        freshHint: "อีกไม่เกิน 10 วินาที พอนับจบไปกล่องขวา",
        upcomingTitle: "เกิดแล้ว",
        upcomingHint: "อยู่ที่นี่ 30 วินาที แล้วย้ายไปรอเกิด",
      }
    : {
        overTitle: "ไม่พบบอส",
        overHint: "ยังห่างกว่า 1 ชั่วโมง จึงยังไม่เริ่มนับ",
        freshTitle: "รอเกิด",
        freshHint: "อีกไม่เกิน 1 ชั่วโมง พอนับจบไปกล่องขวา",
        upcomingTitle: "เกิดแล้ว",
        upcomingHint: "ถึงเวลาที่เลือกแล้ว",
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
  boss: { hour: number; minute: number; second?: number },
  now = Date.now(),
): number {
  return now - bossSelectedAt(boss.hour, boss.minute, boss.second ?? 0, now);
}

/** Trial only: the ready column has already lasted 30 seconds and should return to wait. */
export function bossShouldReturnToWait(
  boss: {
    hour: number;
    minute: number;
    second?: number;
    boardLane?: BossBoardLane | null;
  },
  now = Date.now(),
): boolean {
  if (FINISHED_HOLD_MS === null) return false;
  if (boss.boardLane === "not" || boss.boardLane === "wait") return false;
  return bossElapsedMs(boss, now) >= FINISHED_HOLD_MS;
}

/** Clock that belongs in a column at this moment. The card's time and status follow it. */
export function clockForGroup(
  group: BossTimeGroup,
  now = Date.now(),
): { hour: number; minute: number; second: number } {
  const offsetMs =
    BOSS_WINDOW_MODE === "trial"
      ? group === "fresh"
        ? 5_000
        : group === "upcoming"
          ? -1_000
          : 20_000
      : group === "fresh"
        ? 30 * 60 * 1000
        : group === "upcoming"
          ? -60_000
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
 * Box 2 is the last 10 seconds before the chosen time.
 * Box 3 starts when that countdown ends and lasts 30 seconds, then the row returns to box 2.
 * A ready pin expires with that hold. A not or wait pin stays until it is released.
 */
export function bossTimeGroup(
  boss: {
    hour: number;
    minute: number;
    second?: number;
    boardLane?: BossBoardLane | null;
  },
  now = Date.now(),
): BossTimeGroup {
  const elapsed = bossElapsedMs(boss, now);
  const holdExpired = FINISHED_HOLD_MS !== null && elapsed >= FINISHED_HOLD_MS;
  if (boss.boardLane === "ready" && holdExpired) return "fresh";
  if (boss.boardLane) return LANE_GROUP[boss.boardLane];
  if (elapsed >= 0) {
    if (holdExpired) return "fresh";
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
  hour: number;
  minute: number;
  second: number;
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
