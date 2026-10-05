import type { User } from "@supabase/supabase-js";
import type { AppUserRole as PrismaAppUserRole } from "@/generated/prisma/client";
import { adminEmailAllowlist, isAdminEmail } from "@/lib/admin-emails";
import { prisma } from "@/lib/db";
import type { AppUser, AppUserRole } from "@/types/app-user";

const SEEN_REFRESH_MS = 60_000;
const ACCESS_TTL_MS = 15_000;

type AccessHit = { access: AppAccess; lastSeenAt: number; at: number };

const accessHits = new Map<string, AccessHit>();

function readAccessHit(userId: string): AccessHit | null {
  const hit = accessHits.get(userId);
  if (!hit) return null;
  if (Date.now() - hit.at > ACCESS_TTL_MS) {
    accessHits.delete(userId);
    return null;
  }
  return hit;
}

function rememberAccess(userId: string, access: AppAccess, lastSeenAt: number) {
  const previous = accessHits.get(userId);
  accessHits.set(userId, {
    access,
    lastSeenAt: Math.max(previous?.lastSeenAt ?? 0, lastSeenAt),
    at: Date.now(),
  });
  if (accessHits.size <= 500) return;
  const oldest = accessHits.keys().next().value;
  if (oldest) accessHits.delete(oldest);
}

/** Drop the in-process profile cache after a role or status change. */
export function forgetAppUser(userId: string) {
  accessHits.delete(userId);
}

type AppUserRow = {
  id: string;
  email: string;
  role: PrismaAppUserRole;
  isUse: boolean;
  memberId: string | null;
  member: { id: string; name: string } | null;
  lastSeenAt: Date;
  createdAt: Date;
};

const userWithMember = {
  member: { select: { id: true, name: true } },
} as const;

export type AppAccess = {
  id: string;
  email: string;
  role: AppUserRole;
  isUse: boolean;
  isAdmin: boolean;
  lockedByAllowlist: boolean;
};

function normalizeEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase();
  return value ? value : null;
}

export function accessFromRow(row: {
  id: string;
  email: string;
  role: PrismaAppUserRole;
  isUse: boolean;
}): AppAccess {
  const lockedByAllowlist = isAdminEmail(row.email);
  const role: AppUserRole = lockedByAllowlist ? "admin" : row.role;
  const isUse = lockedByAllowlist ? true : row.isUse;
  return {
    id: row.id,
    email: row.email,
    role,
    isUse,
    isAdmin: role === "admin" && isUse,
    lockedByAllowlist,
  };
}

export function serializeAppUser(
  row: AppUserRow,
  viewerId: string,
): AppUser {
  const access = accessFromRow(row);
  return {
    id: row.id,
    email: row.email,
    role: access.role,
    isUse: access.isUse,
    lockedByAllowlist: access.lockedByAllowlist,
    isSelf: row.id === viewerId,
    memberId: row.memberId,
    memberName: row.member?.name ?? null,
    lastSeenAt: row.lastSeenAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Read-only gate for middleware. Missing rows are normal users until sync. */
export async function peekAppAccess(user: {
  id: string;
  email?: string | null;
}): Promise<{ isAdmin: boolean; isUse: boolean }> {
  if (isAdminEmail(user.email)) return { isAdmin: true, isUse: true };

  const hit = readAccessHit(user.id);
  if (hit) return { isAdmin: hit.access.isAdmin, isUse: hit.access.isUse };

  const row = await prisma.appUser.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, role: true, isUse: true },
  });
  if (!row) return { isAdmin: false, isUse: true };
  const access = accessFromRow(row);
  rememberAccess(user.id, access, 0);
  return { isAdmin: access.isAdmin, isUse: access.isUse };
}

export async function syncAppUser(user: User): Promise<AppAccess | null> {
  const email = normalizeEmail(user.email);
  if (!email) return null;

  const nowMs = Date.now();
  const hit = readAccessHit(user.id);
  if (
    hit &&
    hit.lastSeenAt > 0 &&
    nowMs - hit.lastSeenAt < SEEN_REFRESH_MS &&
    hit.access.email === email
  ) {
    return hit.access;
  }

  const lockedByAllowlist = isAdminEmail(email);
  const now = new Date();
  const existing = await prisma.appUser.findUnique({ where: { id: user.id } });

  if (!existing) {
    const created = await prisma.appUser.create({
      data: {
        id: user.id,
        email,
        role: lockedByAllowlist ? "admin" : "user",
        isUse: true,
        lastSeenAt: now,
      },
    });
    const createdAccess = accessFromRow(created);
    rememberAccess(user.id, createdAccess, created.lastSeenAt.getTime());
    return createdAccess;
  }

  const data: {
    email?: string;
    role?: PrismaAppUserRole;
    isUse?: boolean;
    lastSeenAt?: Date;
  } = {};

  if (existing.email !== email) data.email = email;
  if (lockedByAllowlist && existing.role !== "admin") data.role = "admin";
  if (lockedByAllowlist && !existing.isUse) data.isUse = true;
  if (now.getTime() - existing.lastSeenAt.getTime() >= SEEN_REFRESH_MS) {
    data.lastSeenAt = now;
  }

  const row =
    Object.keys(data).length > 0
      ? await prisma.appUser.update({ where: { id: user.id }, data })
      : existing;

  const access = accessFromRow(row);
  rememberAccess(user.id, access, row.lastSeenAt.getTime());
  return access;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAppUserRole(value: unknown): value is AppUserRole {
  return value === "admin" || value === "user";
}

async function resolveMemberId(
  memberId: unknown,
  exceptUserId?: string,
): Promise<
  | { ok: true; memberId: string | null }
  | { ok: false; status: number; error: string }
> {
  if (memberId === null || memberId === "") {
    return { ok: true, memberId: null };
  }
  if (typeof memberId !== "string") {
    return { ok: false, status: 400, error: "สมาชิกไม่ถูกต้อง" };
  }
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true },
  });
  if (!member) {
    return { ok: false, status: 400, error: "ไม่พบสมาชิก" };
  }
  const taken = await prisma.appUser.findFirst({
    where: {
      memberId: member.id,
      ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
    },
    select: { id: true },
  });
  if (taken) {
    return {
      ok: false,
      status: 409,
      error: "สมาชิกนี้ถูกผูกกับผู้ใช้อื่นแล้ว",
    };
  }
  return { ok: true, memberId: member.id };
}

export async function createManagedUser(input: {
  id: string;
  email: string;
  role: AppUserRole;
  isUse: boolean;
  memberId: string | null;
}): Promise<
  | { ok: true; row: AppUserRow }
  | { ok: false; status: number; error: string }
> {
  const lockedByAllowlist = isAdminEmail(input.email);
  const row = await prisma.appUser.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      email: input.email,
      role: lockedByAllowlist ? "admin" : input.role,
      isUse: lockedByAllowlist ? true : input.isUse,
      memberId: input.memberId,
      lastSeenAt: new Date(),
    },
    update: {
      email: input.email,
      role: lockedByAllowlist ? "admin" : input.role,
      isUse: lockedByAllowlist ? true : input.isUse,
      memberId: input.memberId,
    },
    include: userWithMember,
  });
  return { ok: true, row };
}

export async function readNewUserFields(body: Record<string, unknown>): Promise<
  | {
      ok: true;
      email: string;
      password: string;
      role: AppUserRole;
      isUse: boolean;
      memberId: string | null;
    }
  | { ok: false; status: number; error: string }
> {
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, status: 400, error: "อีเมลไม่ถูกต้อง" };
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 6 || password.length > 72) {
    return {
      ok: false,
      status: 400,
      error: "รหัสผ่านต้องมี 6–72 ตัวอักษร",
    };
  }
  if (!isAppUserRole(body.role)) {
    return { ok: false, status: 400, error: "บทบาทไม่ถูกต้อง" };
  }
  const isUse = typeof body.isUse === "boolean" ? body.isUse : true;
  const member = await resolveMemberId(body.memberId ?? null);
  if (!member.ok) return member;

  const existing = await prisma.appUser.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, status: 409, error: "อีเมลนี้มีบัญชีอยู่แล้ว" };
  }

  return {
    ok: true,
    email,
    password,
    role: body.role,
    isUse,
    memberId: member.memberId,
  };
}

export async function updateManagedUser(
  id: string,
  actorId: string,
  input: { role?: unknown; isUse?: unknown; memberId?: unknown },
): Promise<
  | { ok: true; row: AppUserRow }
  | { ok: false; status: number; error: string }
> {
  if (input.role !== undefined && !isAppUserRole(input.role)) {
    return { ok: false, status: 400, error: "บทบาทไม่ถูกต้อง" };
  }
  if (input.isUse !== undefined && typeof input.isUse !== "boolean") {
    return { ok: false, status: 400, error: "สถานะการใช้งานไม่ถูกต้อง" };
  }

  let nextMemberId: string | null | undefined;
  if (input.memberId !== undefined) {
    const member = await resolveMemberId(input.memberId, id);
    if (!member.ok) return member;
    nextMemberId = member.memberId;
  }

  if (
    input.role === undefined &&
    input.isUse === undefined &&
    nextMemberId === undefined
  ) {
    return { ok: false, status: 400, error: "ไม่มีข้อมูลให้แก้ไข" };
  }

  const target = await prisma.appUser.findUnique({ where: { id } });
  if (!target) {
    return { ok: false, status: 404, error: "ไม่พบผู้ใช้" };
  }
  const nextRole = input.role ?? target.role;
  const nextIsUse = input.isUse ?? target.isUse;
  const roleChange = nextRole !== target.role;
  const useChange = nextIsUse !== target.isUse;
  if ((isAdminEmail(target.email) || id === actorId) && (roleChange || useChange)) {
    return {
      ok: false,
      status: 409,
      error: isAdminEmail(target.email)
        ? "บัญชีใน ADMIN_EMAILS เป็นแอดมินถาวร เปลี่ยนบทบาทหรือปิดใช้งานไม่ได้"
        : "เปลี่ยนบทบาทหรือปิดบัญชีตัวเองไม่ได้",
    };
  }
  const removesAdmin =
    target.role === "admin" && target.isUse && (nextRole !== "admin" || !nextIsUse);

  if (removesAdmin) {
    const allowlist = adminEmailAllowlist().filter(
      (email) => email !== target.email,
    );
    const others = await prisma.appUser.findMany({
      where: { id: { not: id }, isUse: true },
      select: { email: true, role: true },
    });
    const remaining = new Set<string>(allowlist);
    for (const row of others) {
      if (row.role === "admin" || isAdminEmail(row.email)) {
        remaining.add(row.email);
      }
    }
    if (remaining.size === 0) {
      return {
        ok: false,
        status: 409,
        error: "ต้องมีแอดมินที่ใช้งานอยู่อย่างน้อย 1 คน",
      };
    }
  }

  const row = await prisma.appUser.update({
    where: { id },
    data: {
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isUse !== undefined ? { isUse: input.isUse } : {}),
      ...(nextMemberId !== undefined ? { memberId: nextMemberId } : {}),
    },
    include: userWithMember,
  });

  forgetAppUser(id);
  return { ok: true, row };
}
