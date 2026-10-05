import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { syncAppUser, type AppAccess } from "@/lib/app-users";
import { authCookieKey, readAuthSnapshot, writeAuthSnapshot } from "@/lib/auth-snapshot";
import { createClient } from "@/lib/supabase/server";

export type AuthUser = User;

export async function requireUser(): Promise<
  | { user: AuthUser; access: AppAccess; error?: undefined }
  | { user?: undefined; access?: undefined; error: NextResponse }
> {
  const cookieKey = authCookieKey((await cookies()).getAll());
  let user = readAuthSnapshot(cookieKey);
  if (!user) {
    const supabase = await createClient();
    const {
      data: { user: fresh },
    } = await supabase.auth.getUser();
    user = fresh;
    if (user) writeAuthSnapshot(cookieKey, user);
  }

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const access = await syncAppUser(user);
  if (!access) {
    return {
      error: NextResponse.json(
        { error: "บัญชีนี้ไม่มีอีเมล" },
        { status: 403 },
      ),
    };
  }

  if (!access.isUse) {
    return {
      error: NextResponse.json(
        { error: "บัญชีถูกปิดใช้งาน" },
        { status: 403 },
      ),
    };
  }

  return { user, access };
}

/** Admin-only. Role comes from ADMIN_EMAILS or the users table. */
export async function requireAuth(): Promise<
  | { user: AuthUser; access: AppAccess; error?: undefined }
  | { user?: undefined; access?: undefined; error: NextResponse }
> {
  const auth = await requireUser();
  if (auth.error) return auth;

  if (!auth.access.isAdmin) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — ไม่มีสิทธิ์แอดมิน" },
        { status: 403 },
      ),
    };
  }

  return { user: auth.user, access: auth.access };
}

export function actorLabel(user: AuthUser): string {
  return user.email ?? user.id;
}
