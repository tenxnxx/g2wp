import type { TypeServerKind } from "@/types/type-server";

/** Column a card was dragged into. Null means the clock still places it. */
export type BossBoardLane = "not" | "wait" | "ready";

export type Boss = {
  id: string;
  cityId: string;
  cityName: string;
  serverId: string;
  serverName: string;
  typeServerId: string;
  type: TypeServerKind;
  hour: number;
  minute: number;
  second: number;
  boardLane: BossBoardLane | null;
  createBy: string;
  updateBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBossInput = {
  cityId: string;
  serverId: string;
  typeServerId: string;
  hour: number;
  minute: number;
  second?: number;
};

export type UpdateBossInput = Partial<CreateBossInput> & {
  boardLane?: BossBoardLane | null;
};
