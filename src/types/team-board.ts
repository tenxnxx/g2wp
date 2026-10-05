export const MAIN_SLOT_LIMIT = 5;
export const RESERVE_SLOT_LIMIT = 3;

export type TeamSlotType = "waiting" | "main" | "reserve" | "inactive";
export type TeamSessionStatus = "draft" | "active" | "completed";

export type BoardPlayer = {
  assignmentId: string;
  playerId: string;
  memberId: string;
  name: string;
  memberName: string;
  sortOrder: number;
  mine: boolean;
};

export type TeamColumn = {
  id: string;
  name: string;
  sortOrder: number;
  mainLimit: number;
  reserveLimit: number;
  main: BoardPlayer[];
  reserve: BoardPlayer[];
};

export type TeamBoard = {
  session: {
    id: string;
    title: string | null;
    status: TeamSessionStatus;
  };
  teams: TeamColumn[];
  waiting: BoardPlayer[];
  inactive: BoardPlayer[];
};

export type BoardMove =
  | { assignmentId: string; slotType: "waiting" | "inactive" }
  | { assignmentId: string; slotType: "main" | "reserve"; teamId: string };
