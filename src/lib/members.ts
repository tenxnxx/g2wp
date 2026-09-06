export function serializeMember(member: {
  id: string;
  name: string;
  age: number;
  facebookUrl: string | null;
  isLive: boolean;
  groupId: string | null;
  createBy: string;
  createdAt: Date;
  updatedAt: Date;
  group?: { id: string; groupName: string } | null;
}) {
  return {
    id: member.id,
    name: member.name,
    age: member.age,
    facebookUrl: member.facebookUrl,
    isLive: member.isLive,
    groupId: member.groupId,
    groupName: member.group?.groupName ?? null,
    createBy: member.createBy,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

/**
 * Parse groupId from JSON body.
 * - missing key → present: false (PATCH: leave unchanged)
 * - null / "" → clear group
 * - non-empty string → assign that id
 */
export function parseGroupIdInput(
  body: Record<string, unknown>,
):
  | { ok: true; present: false }
  | { ok: true; present: true; groupId: string | null }
  | { ok: false; error: string } {
  if (!("groupId" in body)) {
    return { ok: true, present: false };
  }
  const value = body.groupId;
  if (value === null) {
    return { ok: true, present: true, groupId: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "groupId ต้องเป็นข้อความ" };
  }
  const trimmed = value.trim();
  return { ok: true, present: true, groupId: trimmed || null };
}
