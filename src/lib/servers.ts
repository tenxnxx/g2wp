import type { GameServer } from "@/types/server";

export function serializeServer(row: {
  id: string;
  serverName: string;
  isUse: boolean;
  _count?: { bosses: number };
}): GameServer {
  return {
    id: row.id,
    serverName: row.serverName,
    isUse: row.isUse,
    ...(row._count ? { bossCount: row._count.bosses } : {}),
  };
}
