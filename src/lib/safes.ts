import type { Safe } from "@/types/safe";

export function serializeSafe(row: {
  id: string;
  itemId: string;
  quantity: number;
  description: string | null;
  depositItemAt: Date;
  memberId: string;
  createdAt: Date;
  updatedAt: Date;
  item: { id: string; name: string };
  member: { id: string; name: string };
}): Safe {
  return {
    id: row.id,
    itemId: row.itemId,
    itemName: row.item.name,
    quantity: row.quantity,
    description: row.description,
    depositItemAt: row.depositItemAt.toISOString(),
    memberId: row.memberId,
    memberName: row.member.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const safeInclude = {
  item: { select: { id: true, name: true } },
  member: { select: { id: true, name: true } },
} as const;
