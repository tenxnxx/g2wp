import type { Item } from "@/types/item";

export function serializeItem(row: {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { safes: number };
}): Item {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row._count ? { safeCount: row._count.safes } : {}),
  };
}
