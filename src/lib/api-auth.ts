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

function mustUseAllowlist(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.REQUIRE_ADMIN_ALLOWLIST === "1"
  );
}

function isAllowedAdmin(user: User): boolean {
  const role = user.app_metadata?.role;
  if (role === "admin") return true;

  const allowlist = adminEmailAllowlist();
  if (allowlist.length === 0) {
    // Fail closed in production / when REQUIRE_ADMIN_ALLOWLIST=1
    return !mustUseAllowlist();
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
    const emptyAllowlist = adminEmailAllowlist().length === 0 && mustUseAllowlist();
    return {
      error: NextResponse.json(
        {
          error: emptyAllowlist
            ? "Forbidden — ตั้ง ADMIN_EMAILS ใน production"
            : "Forbidden — ไม่มีสิทธิ์แอดมิน",
        },
        { status: 403 },
      ),
    };
  }

  return { user };
}

export function actorLabel(user: AuthUser): string {
  return user.email ?? user.id;
}
