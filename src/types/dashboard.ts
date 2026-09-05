import type { Member } from "@/types/member";

export type DashboardSummary = {
  members: number;
  players: number;
  behaviors: number;
};

/** Lightweight list row — no nested players/behaviors. */
export type DashboardMemberListItem = Member & {
  playerCount: number;
  behaviorCount: number;
};

export type DashboardResponse = {
  summary: DashboardSummary;
  members: DashboardMemberListItem[];
};
