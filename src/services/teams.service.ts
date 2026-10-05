import type { BoardMove, TeamBoard } from "@/types/team-board";

const BASE = "/api/teams/board";

async function parseJson(res: Response): Promise<TeamBoard> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: unknown }).error)
        : "Request failed";
    throw new Error(message);
  }
  return data as TeamBoard;
}

function post(body: Record<string, unknown>) {
  return fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(parseJson);
}

export const teamsService = {
  board(): Promise<TeamBoard> {
    return fetch(BASE, { cache: "no-store" }).then(parseJson);
  },
  move(input: BoardMove): Promise<TeamBoard> {
    return post({ action: "move", ...input });
  },
  swap(assignmentId: string, targetAssignmentId: string): Promise<TeamBoard> {
    return post({ action: "swap", assignmentId, targetAssignmentId });
  },
  fill(): Promise<TeamBoard> {
    return post({ action: "fill" });
  },
  clearInactive(): Promise<TeamBoard> {
    return post({ action: "clearInactive" });
  },
  clearTeams(): Promise<TeamBoard> {
    return post({ action: "clearTeams" });
  },
  addTeam(input: { name: string; mainLimit: number; reserveLimit: number }): Promise<TeamBoard> {
    return post({ action: "addTeam", ...input });
  },
  updateTeam(
    teamId: string,
    input: { name: string; mainLimit: number; reserveLimit: number },
  ): Promise<TeamBoard> {
    return post({ action: "updateTeam", teamId, ...input });
  },
  reorder(teamIds: string[]): Promise<TeamBoard> {
    return post({ action: "reorderTeams", teamIds });
  },
  removeTeam(teamId: string): Promise<TeamBoard> {
    return post({ action: "removeTeam", teamId });
  },
  start(): Promise<TeamBoard> {
    return post({ action: "start" });
  },
  complete(): Promise<TeamBoard> {
    return post({ action: "complete" });
  },
};
