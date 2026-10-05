import type { TypeServer, TypeServerKind } from "@/types/type-server";

export function serializeTypeServer(row: {
  id: string;
  type: TypeServerKind;
  isUse: boolean;
  _count?: { bosses: number };
}): TypeServer {
  return {
    id: row.id,
    type: row.type,
    isUse: row.isUse,
    ...(row._count ? { bossCount: row._count.bosses } : {}),
  };
}
