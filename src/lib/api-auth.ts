import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type AuthUser = User;

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

  return { user };
}

export function actorLabel(user: AuthUser): string {
  return user.email ?? user.id;
}
