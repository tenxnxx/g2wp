export type BehaviorReportStatus = "pending" | "approved" | "cancelled";

export type BehaviorReport = {
  id: string;
  memberId: string;
  playerId: string;
  message: string;
  evidenceUrl: string | null;
  status: BehaviorReportStatus;
  memberNameSnap: string;
  playerNameSnap: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  behaviorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BehaviorReportDetail = BehaviorReport & {
  member: {
    id: string;
    name: string;
    age: number;
    facebookUrl: string | null;
    isLive: boolean;
    playerCount: number;
    behaviorCount: number;
    players: Array<{ id: string; name: string }>;
    recentBehaviors: Array<{
      id: string;
      description: string;
      createdAt: string;
      player: { id: string; name: string };
    }>;
  };
  player: {
    id: string;
    name: string;
  };
};

export type CreatePublicReportInput = {
  playerId: string;
  message: string;
  evidenceUrl?: string | null;
};

export type DecideReportInput = {
  status: "approved" | "cancelled";
  note?: string | null;
};

export type PublicReportPlayerOption = {
  id: string;
  name: string;
  memberId: string;
  memberName: string;
};
