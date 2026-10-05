import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16+ uses `proxy` (formerly `middleware`) for edge request guards.
 * See node_modules/next/dist/docs/.../proxy.md
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets.
     * Auth + public allowlist live in updateSession().
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon$|apple-icon$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
