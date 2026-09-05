import type {
  CheckEvent,
  CheckEventCounts,
  CheckEventMember,
  CheckEventStatus,
  CheckMemberStatus,
} from "@/types/check-event";

function toDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Accept string/number titles; keep digits (Arabic + Thai numerals). */
export function normalizeEventTitle(value: unknown): string | null {
  if (value == null) return null;
  const thaiDigits = "๐๑๒๓๔๕๖๗๘๙";
  const raw = String(value).replace(/[๐-๙]/g, (ch) =>
    String(thaiDigits.indexOf(ch)),
  );
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function emptyCounts(): CheckEventCounts {
  return { total: 0, pending: 0, approved: 0, cancelled: 0 };
}

function buildCounts(
  members: Array<{ status: CheckMemberStatus }>,
): CheckEventCounts {
  const counts = emptyCounts();
  counts.total = members.length;
  for (const row of members) {
    counts[row.status] += 1;
  }
  return counts;
}

/** Merge Prisma groupBy({ by: [checkEventId, status], _count }) into a map. */
export function countsFromGroupBy(
  rows: Array<{
    checkEventId: string;
    status: CheckMemberStatus;
    _count: { _all: number } | number;
  }>,
): Map<string, CheckEventCounts> {
  const map = new Map<string, CheckEventCounts>();
  for (const row of rows) {
    const count =
      typeof row._count === "number" ? row._count : row._count._all;
    const current = map.get(row.checkEventId) ?? emptyCounts();
    current[row.status] += count;
    current.total += count;
    map.set(row.checkEventId, current);
  }
  return map;
}

export function serializeCheckEvent(
  event: {
    id: string;
    setDateId: string;
    title: string | null;
    status: CheckEventStatus;
    createBy: string;
    openedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    setDate: { id: string; date: Date };
    members?: Array<{ status: CheckMemberStatus }>;
  },
  counts?: CheckEventCounts,
): CheckEvent {
  return {
    id: event.id,
    setDateId: event.setDateId,
    setDate: {
      id: event.setDate.id,
      date: toDateOnlyString(event.setDate.date),
    },
    title: event.title,
    status: event.status,
    createBy: event.createBy,
    openedAt: event.openedAt?.toISOString() ?? null,
    closedAt: event.closedAt?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    counts: counts ?? buildCounts(event.members ?? []),
  };
}

export function serializeCheckEventMember(row: {
  id: string;
  checkEventId: string;
  memberId: string;
  memberNameSnapshot: string;
  status: CheckMemberStatus;
  decidedBy: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  member: {
    id: string;
    name: string;
    age: number;
    isLive: boolean;
  };
}): CheckEventMember {
  return {
    id: row.id,
    checkEventId: row.checkEventId,
    memberId: row.memberId,
    memberNameSnapshot: row.memberNameSnapshot,
    status: row.status,
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    member: row.member,
  };
}

/** Lightweight include for single-event responses that still need member status rows. */
export const checkEventInclude = {
  setDate: { select: { id: true, date: true } },
  members: { select: { status: true } },
} as const;

/** List include — pair with groupBy counts (no member status rows). */
export const checkEventListInclude = {
  setDate: { select: { id: true, date: true } },
} as const;
