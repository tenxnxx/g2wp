import { Prisma } from "@/generated/prisma/client";
import { TeamSessionStatus, TeamSlotType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  type BoardPlayer,
  type TeamBoard,
  type TeamColumn,
} from "@/types/team-board";

const TEAM_NAME_MAX = 40;

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

class BoardConflict extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BoardConflict";
    this.status = status;
  }
}

function conflictResult(error: unknown): Result<never> | null {
  if (error instanceof BoardConflict) {
    return { ok: false, error: error.message, status: error.status };
  }
  return null;
}

type Tx = Prisma.TransactionClient;

async function lockSession(tx: Tx, sessionId: string) {
  await tx.$queryRaw`SELECT id FROM team_sessions WHERE id = ${sessionId} FOR UPDATE`;
}

async function lockTeam(tx: Tx, teamId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM teams WHERE id = ${teamId} AND is_use = true FOR UPDATE
  `;
  if (rows.length === 0) return null;
  return tx.team.findFirst({
    where: { id: teamId, isUse: true },
    select: { id: true, mainLimit: true, reserveLimit: true },
  });
}

function readTeamName(name: string): Result<string> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "กรอกชื่อทีม", status: 400 };
  if (trimmed.length > TEAM_NAME_MAX) {
    return { ok: false, error: "ชื่อทีมยาวเกิน 40 ตัวอักษร", status: 400 };
  }
  return { ok: true, data: trimmed };
}

const SLOT_LIMIT_MIN = 1;
const SLOT_LIMIT_MAX = 30;

function readSlotLimit(value: number, label: string): Result<number> {
  if (!Number.isInteger(value) || value < SLOT_LIMIT_MIN || value > SLOT_LIMIT_MAX) {
    return {
      ok: false,
      error: `${label}ต้องอยู่ระหว่าง ${SLOT_LIMIT_MIN} ถึง ${SLOT_LIMIT_MAX} คน`,
      status: 400,
    };
  }
  return { ok: true, data: value };
}

function sessionTitle(now: Date): string {
  const date = new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(now);
  return `รอบวันที่ ${date}`;
}

function toPlayer(row: {
  id: string;
  playerId: string;
  sortOrder: number;
  player: { name: string; member: { name: string } };
}): BoardPlayer {
  return {
    assignmentId: row.id,
    playerId: row.playerId,
    name: row.player.name,
    memberName: row.player.member.name,
    sortOrder: row.sortOrder,
  };
}

async function openSession(actor: string) {
  const active = await prisma.teamSession.findFirst({
    where: { status: TeamSessionStatus.active },
    orderBy: { createdAt: "desc" },
  });
  if (active) return active;

  const draft = await prisma.teamSession.findFirst({
    where: { status: TeamSessionStatus.draft },
    orderBy: { createdAt: "desc" },
  });
  if (draft) return draft;

  const created = await prisma.teamSession.create({
    data: {
      title: sessionTitle(new Date()),
      status: TeamSessionStatus.draft,
      createBy: actor,
    },
  });
  await attachMissingPlayers(created.id, actor);
  return created;
}

/** Put one new player on the open board. The read path does not scan every player. */
export async function attachPlayerToOpenBoard(playerId: string, actor: string) {
  const session = await prisma.teamSession.findFirst({
    where: {
      status: { in: [TeamSessionStatus.active, TeamSessionStatus.draft] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!session) return;

  const sortOrder = await prisma.teamAssignment.count({
    where: { sessionId: session.id },
  });
  await prisma.teamAssignment.createMany({
    data: [
      {
        sessionId: session.id,
        playerId,
        slotType: TeamSlotType.waiting,
        sortOrder,
        createBy: actor,
      },
    ],
    skipDuplicates: true,
  });
}

async function attachMissingPlayers(sessionId: string, actor: string) {
  const [assigned, players] = await Promise.all([
    prisma.teamAssignment.findMany({
      where: { sessionId },
      select: { playerId: true },
    }),
    prisma.player.findMany({
      select: { id: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const have = new Set(assigned.map((row) => row.playerId));
  const missing = players.filter((player) => !have.has(player.id));
  if (missing.length === 0) return;

  await prisma.teamAssignment.createMany({
    data: missing.map((player, index) => ({
      sessionId,
      playerId: player.id,
      slotType: TeamSlotType.waiting,
      sortOrder: assigned.length + index,
      createBy: actor,
    })),
    skipDuplicates: true,
  });
}

function groupBoard(
  session: { id: string; title: string | null; status: TeamSessionStatus },
  teams: { id: string; name: string; sortOrder: number; mainLimit: number; reserveLimit: number }[],
  rows: {
    id: string;
    playerId: string;
    teamId: string | null;
    slotType: TeamSlotType;
    sortOrder: number;
    player: { name: string; member: { name: string } };
  }[],
): TeamBoard {
  const columns = new Map<string, TeamColumn>(
    teams.map((team) => [
      team.id,
      { id: team.id, name: team.name, sortOrder: team.sortOrder, mainLimit: team.mainLimit, reserveLimit: team.reserveLimit, main: [], reserve: [] },
    ]),
  );
  const waiting: BoardPlayer[] = [];
  const inactive: BoardPlayer[] = [];

  for (const row of rows) {
    const player = toPlayer(row);
    if (row.slotType === TeamSlotType.main && row.teamId && columns.has(row.teamId)) {
      columns.get(row.teamId)!.main.push(player);
    } else if (
      row.slotType === TeamSlotType.reserve &&
      row.teamId &&
      columns.has(row.teamId)
    ) {
      columns.get(row.teamId)!.reserve.push(player);
    } else if (row.slotType === TeamSlotType.inactive) {
      inactive.push(player);
    } else {
      waiting.push(player);
    }
  }

  const byOrder = (a: BoardPlayer, b: BoardPlayer) =>
    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "th");
  waiting.sort(byOrder);
  inactive.sort(byOrder);
  for (const column of columns.values()) {
    column.main.sort(byOrder);
    column.reserve.sort(byOrder);
  }

  return {
    session: { id: session.id, title: session.title, status: session.status },
    teams: [...columns.values()],
    waiting,
    inactive,
  };
}

export async function loadTeamBoard(actor: string): Promise<TeamBoard> {
  const session = await openSession(actor);
  const [assignmentCount, playerCount] = await Promise.all([
    prisma.teamAssignment.count({ where: { sessionId: session.id } }),
    prisma.player.count(),
  ]);
  if (assignmentCount < playerCount) {
    await attachMissingPlayers(session.id, actor);
  }

  const [teams, rows] = await Promise.all([
    prisma.team.findMany({
      where: { isUse: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sortOrder: true, mainLimit: true, reserveLimit: true },
    }),
    prisma.teamAssignment.findMany({
      where: { sessionId: session.id },
      include: { player: { include: { member: { select: { name: true } } } } },
    }),
  ]);

  return groupBoard(session, teams, rows);
}

async function nextSortOrder(
  tx: Tx,
  sessionId: string,
  slotType: TeamSlotType,
  teamId: string | null,
) {
  const last = await tx.teamAssignment.aggregate({
    where: { sessionId, slotType, teamId },
    _max: { sortOrder: true },
  });
  return (last._max.sortOrder ?? -1) + 1;
}

export async function moveAssignment(
  actor: string,
  input: {
    assignmentId: string;
    slotType: TeamSlotType;
    teamId?: string | null;
  },
): Promise<Result<TeamBoard>> {
  const session = await openSession(actor);
  const placed =
    input.slotType === TeamSlotType.main || input.slotType === TeamSlotType.reserve;
  const teamId = placed ? input.teamId?.trim() || null : null;
  if (placed && !teamId) {
    return { ok: false, error: "ต้องเลือกทีม", status: 400 };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await lockSession(tx, session.id);
      const current = await tx.teamAssignment.findFirst({
        where: { id: input.assignmentId, sessionId: session.id },
      });
      if (!current) throw new BoardConflict("ไม่พบผู้เล่นในรอบนี้", 404);

      if (teamId) {
        const team = await lockTeam(tx, teamId);
        if (!team) throw new BoardConflict("ไม่พบทีม", 404);
        const limit = input.slotType === TeamSlotType.main ? team.mainLimit : team.reserveLimit;
        const count = await tx.teamAssignment.count({
          where: {
            sessionId: session.id,
            teamId,
            slotType: input.slotType,
            id: { not: current.id },
          },
        });
        if (count >= limit) throw new BoardConflict("ช่องของทีมนี้เต็มแล้ว", 409);
      }

      const sortOrder = await nextSortOrder(tx, session.id, input.slotType, teamId);
      await tx.teamAssignment.update({
        where: { id: current.id },
        data: { slotType: input.slotType, teamId, sortOrder },
      });
    });
  } catch (error) {
    const conflict = conflictResult(error);
    if (conflict) return conflict;
    throw error;
  }

  return { ok: true, data: await loadTeamBoard(actor) };
}

export async function swapAssignments(
  actor: string,
  sourceId: string,
  targetId: string,
): Promise<Result<TeamBoard>> {
  if (!sourceId || !targetId || sourceId === targetId) {
    return { ok: false, error: "เลือกผู้เล่นสองคนเพื่อสลับ", status: 400 };
  }

  const session = await openSession(actor);
  try {
    await prisma.$transaction(async (tx) => {
      await lockSession(tx, session.id);
      const [source, target] = await Promise.all([
        tx.teamAssignment.findFirst({
          where: { id: sourceId, sessionId: session.id },
        }),
        tx.teamAssignment.findFirst({
          where: { id: targetId, sessionId: session.id },
        }),
      ]);
      if (!source || !target) throw new BoardConflict("ไม่พบผู้เล่นในรอบนี้", 404);

      const teamIds = [...new Set([source.teamId, target.teamId].filter((id): id is string => Boolean(id)))].sort();
      for (const id of teamIds) {
        await lockTeam(tx, id);
      }

      await tx.teamAssignment.update({
        where: { id: source.id },
        data: {
          slotType: target.slotType,
          teamId: target.teamId,
          sortOrder: target.sortOrder,
        },
      });
      await tx.teamAssignment.update({
        where: { id: target.id },
        data: {
          slotType: source.slotType,
          teamId: source.teamId,
          sortOrder: source.sortOrder,
        },
      });
    });
  } catch (error) {
    const conflict = conflictResult(error);
    if (conflict) return conflict;
    throw error;
  }

  return { ok: true, data: await loadTeamBoard(actor) };
}

export async function fillTeams(actor: string): Promise<TeamBoard> {
  const session = await openSession(actor);
  await prisma.$transaction(async (tx) => {
    await lockSession(tx, session.id);
    const [teams, rows] = await Promise.all([
      tx.team.findMany({
        where: { isUse: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, mainLimit: true, reserveLimit: true },
      }),
      tx.teamAssignment.findMany({
        where: { sessionId: session.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    const waiting = rows.filter((row) => row.slotType === TeamSlotType.waiting);
    const counts = new Map<string, { main: number; reserve: number }>();
    for (const team of teams) counts.set(team.id, { main: 0, reserve: 0 });
    for (const row of rows) {
      if (!row.teamId || !counts.has(row.teamId)) continue;
      const bucket = counts.get(row.teamId)!;
      if (row.slotType === TeamSlotType.main) bucket.main += 1;
      if (row.slotType === TeamSlotType.reserve) bucket.reserve += 1;
    }

    let cursor = 0;
    const place = async (slotType: typeof TeamSlotType.main | typeof TeamSlotType.reserve) => {
      for (const team of teams) {
        const bucket = counts.get(team.id)!;
        const key = slotType === TeamSlotType.main ? "main" : "reserve";
        const limit = slotType === TeamSlotType.main ? team.mainLimit : team.reserveLimit;
        while (bucket[key] < limit && cursor < waiting.length) {
          const row = waiting[cursor];
          cursor += 1;
          bucket[key] += 1;
          await tx.teamAssignment.update({
            where: { id: row.id },
            data: { teamId: team.id, slotType, sortOrder: bucket[key] },
          });
        }
      }
    };

    await place(TeamSlotType.main);
    await place(TeamSlotType.reserve);
  });

  return loadTeamBoard(actor);
}

export async function clearInactive(actor: string): Promise<TeamBoard> {
  const session = await openSession(actor);
  await prisma.$transaction(async (tx) => {
    await lockSession(tx, session.id);
    const sortOrder = await nextSortOrder(tx, session.id, TeamSlotType.waiting, null);
    const rows = await tx.teamAssignment.findMany({
      where: { sessionId: session.id, slotType: TeamSlotType.inactive },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    for (const [index, row] of rows.entries()) {
      await tx.teamAssignment.update({
        where: { id: row.id },
        data: {
          slotType: TeamSlotType.waiting,
          teamId: null,
          sortOrder: sortOrder + index,
        },
      });
    }
  });
  return loadTeamBoard(actor);
}

export async function clearTeams(actor: string): Promise<TeamBoard> {
  const session = await openSession(actor);
  await prisma.$transaction(async (tx) => {
    await lockSession(tx, session.id);
    const sortOrder = await nextSortOrder(tx, session.id, TeamSlotType.waiting, null);
    const rows = await tx.teamAssignment.findMany({
      where: {
        sessionId: session.id,
        slotType: { in: [TeamSlotType.main, TeamSlotType.reserve] },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    for (const [index, row] of rows.entries()) {
      await tx.teamAssignment.update({
        where: { id: row.id },
        data: {
          slotType: TeamSlotType.waiting,
          teamId: null,
          sortOrder: sortOrder + index,
        },
      });
    }
  });
  return loadTeamBoard(actor);
}

export async function addTeam(
  actor: string,
  input: { name: string; mainLimit: number; reserveLimit: number },
): Promise<Result<TeamBoard>> {
  const parsed = readTeamName(input.name);
  if (!parsed.ok) return parsed;
  const mainLimit = readSlotLimit(input.mainLimit, "จำนวนคนในทีม");
  if (!mainLimit.ok) return mainLimit;
  const reserveLimit = readSlotLimit(input.reserveLimit, "จำนวนคนสำรอง");
  if (!reserveLimit.ok) return reserveLimit;

  const duplicate = await prisma.team.findFirst({
    where: { name: parsed.data, isUse: true },
    select: { id: true },
  });
  if (duplicate) return { ok: false, error: "มีชื่อทีมนี้อยู่แล้ว", status: 409 };

  const last = await prisma.team.aggregate({ _max: { sortOrder: true } });
  await prisma.team.create({
    data: {
      name: parsed.data,
      sortOrder: (last._max.sortOrder ?? 0) + 1,
      isUse: true,
      mainLimit: mainLimit.data,
      reserveLimit: reserveLimit.data,
    },
  });
  return { ok: true, data: await loadTeamBoard(actor) };
}

export async function reorderTeams(actor: string, teamIds: string[]): Promise<Result<TeamBoard>> {
  const teams = await prisma.team.findMany({
    where: { isUse: true },
    select: { id: true },
  });
  const known = new Set(teams.map((team) => team.id));
  const unique = new Set(teamIds);
  if (
    teamIds.length !== teams.length ||
    unique.size !== teamIds.length ||
    teamIds.some((id) => !known.has(id))
  ) {
    return { ok: false, error: "ลำดับทีมไม่ถูกต้อง", status: 400 };
  }

  await prisma.$transaction(
    teamIds.map((id, index) =>
      prisma.team.update({
        where: { id },
        data: { sortOrder: index + 1 },
      }),
    ),
  );
  return { ok: true, data: await loadTeamBoard(actor) };
}

export async function updateTeam(
  actor: string,
  teamId: string,
  input: { name: string; mainLimit: number; reserveLimit: number },
): Promise<Result<TeamBoard>> {
  const parsed = readTeamName(input.name);
  if (!parsed.ok) return parsed;
  const mainLimit = readSlotLimit(input.mainLimit, "จำนวนคนในทีม");
  if (!mainLimit.ok) return mainLimit;
  const reserveLimit = readSlotLimit(input.reserveLimit, "จำนวนคนสำรอง");
  if (!reserveLimit.ok) return reserveLimit;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || !team.isUse) return { ok: false, error: "ไม่พบทีม", status: 404 };

  if (team.name !== parsed.data) {
    const duplicate = await prisma.team.findFirst({
      where: { name: parsed.data, isUse: true, id: { not: teamId } },
      select: { id: true },
    });
    if (duplicate) return { ok: false, error: "มีชื่อทีมนี้อยู่แล้ว", status: 409 };
  }

  const session = await openSession(actor);
  try {
    await prisma.$transaction(async (tx) => {
      await lockSession(tx, session.id);
      const team = await lockTeam(tx, teamId);
      if (!team) throw new BoardConflict("ไม่พบทีม", 404);

      const [mainCount, reserveCount] = await Promise.all([
        tx.teamAssignment.count({
          where: { sessionId: session.id, teamId, slotType: TeamSlotType.main },
        }),
        tx.teamAssignment.count({
          where: { sessionId: session.id, teamId, slotType: TeamSlotType.reserve },
        }),
      ]);
      if (mainCount > mainLimit.data) {
        throw new BoardConflict(
          `ทีมหลักมีผู้เล่น ${mainCount} คน ลดจำนวนต่ำกว่านี้ไม่ได้`,
          409,
        );
      }
      if (reserveCount > reserveLimit.data) {
        throw new BoardConflict(
          `ทีมสำรองมีผู้เล่น ${reserveCount} คน ลดจำนวนต่ำกว่านี้ไม่ได้`,
          409,
        );
      }

      await tx.team.update({
        where: { id: teamId },
        data: {
          name: parsed.data,
          mainLimit: mainLimit.data,
          reserveLimit: reserveLimit.data,
        },
      });
    });
  } catch (error) {
    const conflict = conflictResult(error);
    if (conflict) return conflict;
    throw error;
  }

  return { ok: true, data: await loadTeamBoard(actor) };
}

export async function removeTeam(actor: string, teamId: string): Promise<Result<TeamBoard>> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || !team.isUse) return { ok: false, error: "ไม่พบทีม", status: 404 };

  const session = await openSession(actor);
  await prisma.$transaction(async (tx) => {
    await lockSession(tx, session.id);
    const sortOrder = await nextSortOrder(tx, session.id, TeamSlotType.waiting, null);
    const rows = await tx.teamAssignment.findMany({
      where: { sessionId: session.id, teamId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });

    for (const [index, row] of rows.entries()) {
      await tx.teamAssignment.update({
        where: { id: row.id },
        data: {
          slotType: TeamSlotType.waiting,
          teamId: null,
          sortOrder: sortOrder + index,
        },
      });
    }
    await tx.team.update({ where: { id: teamId }, data: { isUse: false } });
  });

  return { ok: true, data: await loadTeamBoard(actor) };
}

export async function startSession(actor: string): Promise<Result<TeamBoard>> {
  const session = await openSession(actor);
  if (session.status !== TeamSessionStatus.draft) {
    return { ok: false, error: "รอบนี้เริ่มไปแล้ว", status: 409 };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.teamSession.updateMany({
      where: { status: TeamSessionStatus.active, id: { not: session.id } },
      data: { status: TeamSessionStatus.completed, endedAt: now },
    }),
    prisma.teamSession.update({
      where: { id: session.id },
      data: { status: TeamSessionStatus.active, startedAt: now },
    }),
  ]);
  return { ok: true, data: await loadTeamBoard(actor) };
}

export async function completeSession(actor: string): Promise<Result<TeamBoard>> {
  const session = await openSession(actor);
  if (session.status !== TeamSessionStatus.active) {
    return { ok: false, error: "รอบนี้ยังไม่ได้เริ่ม", status: 409 };
  }

  await prisma.teamSession.update({
    where: { id: session.id },
    data: { status: TeamSessionStatus.completed, endedAt: new Date() },
  });
  return { ok: true, data: await loadTeamBoard(actor) };
}
