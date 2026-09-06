import type {
  BehaviorReport,
  BehaviorReportDetail,
  BehaviorReportStatus,
} from "@/types/behavior-report";

export function serializeBehaviorReport(row: {
  id: string;
  memberId: string;
  playerId: string;
  message: string;
  evidenceUrl: string | null;
  status: BehaviorReportStatus;
  memberNameSnap: string;
  playerNameSnap: string;
  decidedBy: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  behaviorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BehaviorReport {
  return {
    id: row.id,
    memberId: row.memberId,
    playerId: row.playerId,
    message: row.message,
    evidenceUrl: row.evidenceUrl,
    status: row.status,
    memberNameSnap: row.memberNameSnap,
    playerNameSnap: row.playerNameSnap,
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    decisionNote: row.decisionNote,
    behaviorId: row.behaviorId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeBehaviorReportDetail(row: {
  id: string;
  memberId: string;
  playerId: string;
  message: string;
  evidenceUrl: string | null;
  status: BehaviorReportStatus;
  memberNameSnap: string;
  playerNameSnap: string;
  decidedBy: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  behaviorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  member: {
    id: string;
    name: string;
    age: number;
    facebookUrl: string | null;
    isLive: boolean;
    players: Array<{ id: string; name: string }>;
    behaviors: Array<{
      id: string;
      description: string;
      createdAt: Date;
      player: { id: string; name: string };
    }>;
    _count: { players: number; behaviors: number };
  };
  player: { id: string; name: string };
}): BehaviorReportDetail {
  return {
    ...serializeBehaviorReport(row),
    member: {
      id: row.member.id,
      name: row.member.name,
      age: row.member.age,
      facebookUrl: row.member.facebookUrl,
      isLive: row.member.isLive,
      playerCount: row.member._count.players,
      behaviorCount: row.member._count.behaviors,
      players: row.member.players,
      recentBehaviors: row.member.behaviors.map((b) => ({
        id: b.id,
        description: b.description,
        createdAt: b.createdAt.toISOString(),
        player: b.player,
      })),
    },
    player: row.player,
  };
}

export const REPORT_MESSAGE_MIN = 10;
export const REPORT_MESSAGE_MAX = 2000;
export const REPORT_EVIDENCE_URL_MAX = 2048;
