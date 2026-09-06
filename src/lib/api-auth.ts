import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type AuthUser = User;

function adminEmailAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedAdmin(user: User): boolean {
  const role = user.app_metadata?.role;
  if (role === "admin") return true;

  const allowlist = adminEmailAllowlist();
  if (allowlist.length === 0) {
    // Local/dev convenience: any authenticated user. Production should set ADMIN_EMAILS.
    return true;
  }

  const email = user.email?.toLowerCase();
  return Boolean(email && allowlist.includes(email));
}

export async function requireAuth(): Promise<
  { user: AuthUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!isAllowedAdmin(user)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — ไม่มีสิทธิ์แอดมิน" },
        { status: 403 },
      ),
    };
  }

  return { user };
}

export function actorLabel(user: AuthUser): string {
  return user.email ?? user.id;
}
