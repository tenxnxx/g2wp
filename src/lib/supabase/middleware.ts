import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin-emails";
import { authCookieKey, readAuthSnapshot, writeAuthSnapshot } from "@/lib/auth-snapshot";
import { peekAppAccess } from "@/lib/app-users";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/safe-next-path";

const USER_PAGE = "/teams";

function normalUserMayCallApi(request: NextRequest): boolean {
  return request.method === "GET" && request.nextUrl.pathname === "/api/teams/board";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const cookieKey = authCookieKey(request.cookies.getAll());
  let user = readAuthSnapshot(cookieKey);
  if (!user) {
    const {
      data: { user: fresh },
    } = await supabase.auth.getUser();
    user = fresh;
    if (user) writeAuthSnapshot(cookieKey, user);
  }

  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith("/api/");
  const isPublic =
    pathname === "/login" ||
    pathname === "/report" ||
    pathname.startsWith("/api/public/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon" ||
    pathname === "/apple-icon";

  if (!user && !isPublic) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", safeNextPath(pathname));
    return NextResponse.redirect(url);
  }

  let admin = user ? isAdminEmail(user.email) : false;
  if (user && !admin) {
    try {
      const access = await peekAppAccess(user);
      if (!access.isUse) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.search = "";
        url.searchParams.set("error", "disabled");
        const redirect = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirect.cookies.set(cookie);
        });
        return redirect;
      }
      admin = access.isAdmin;
    } catch (error) {
      console.error("peekAppAccess", error);
    }
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    url.pathname = admin ? (next === "/" ? USER_PAGE : next) : USER_PAGE;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && !admin && !isPublic && pathname !== USER_PAGE) {
    if (isApi) {
      if (normalUserMayCallApi(request)) return supabaseResponse;
      return NextResponse.json(
        { error: "Forbidden — ไม่มีสิทธิ์แอดมิน" },
        { status: 403 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = USER_PAGE;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
