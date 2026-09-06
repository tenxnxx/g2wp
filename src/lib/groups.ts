import type { Group } from "@/types/group";

export function serializeGroup(row: {
  id: string;
  groupName: string;
  isUse: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { members: number };
}): Group {
  return {
    id: row.id,
    groupName: row.groupName,
    isUse: row.isUse,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row._count ? { memberCount: row._count.members } : {}),
  };
}
