# member_warzth — Project Audit (2026-09-09)

Stack: Next.js 16 (App Router) + React 19 + Prisma 7 + Supabase Auth + Postgres (Supabase) + TanStack Query + Tailwind 4 + Netlify

Domain: WarZTH / G2WP member ops — members, players, behaviors, public reports, check-events, safes/items, groups, set-dates, dashboard.

## Verdict

Solid early architecture (services / API routes / validation / pagination / some rate limits). **Not production-safe yet** until P0 security items are fixed. Performance is acceptable for small admin use; page load leans client-heavy.

---

## Architecture (good)

- Clear split: `src/app/api/*` → `src/services/*` (client) → `src/lib/*` (domain helpers) → Prisma
- Models cover member lifecycle, behavior reports, attendance-style check events, safes
- Input length caps (`field-limits.ts`), pagination cap `limit ≤ 200`
- Public report soft-idempotency (2 min duplicate window)
- Check-event open uses `$transaction` + conflict if another event already open
- Security headers in `next.config.ts` (XFO, nosniff, Referrer-Policy, Permissions-Policy, CSP)
- `safeNextPath` blocks open redirects on `next=`

---

## Security findings (defensive)

| ID | Severity | Finding | Evidence | Remediation |
|----|----------|---------|----------|-------------|
| S1 | **P0 Critical** | Real DB credentials / keys committed in `.env.example` (tracked by git) | `git ls-files` → `.env.example`; file contains live `DATABASE_URL` / `DIRECT_URL` passwords and Supabase keys | Rotate DB password + review Supabase keys immediately; replace `.env.example` with placeholders only; purge from git history if repo was/will be shared |
| S2 | **P0 Critical** | No Next.js root `middleware.ts` — `updateSession` in `src/lib/supabase/middleware.ts` is never wired | `middleware.ts` / `src/middleware.ts` both missing | Add `src/middleware.ts` that calls `updateSession`; protect all non-public routes at the edge |
| S3 | **P0 High** | If `ADMIN_EMAILS` unset, **any authenticated Supabase user is treated as admin** | `src/lib/api-auth.ts` `isAllowedAdmin` returns `true` when allowlist empty | Fail closed in production (`NODE_ENV=production` or `REQUIRE_ADMIN_ALLOWLIST=1`); document `ADMIN_EMAILS` in `.env.example`; prefer `app_metadata.role === "admin"` |
| S4 | **P1** | Dashboard HTML/JS not server-guarded — relies on client `AuthProvider` + API `requireAuth` | No middleware; `(dashboard)/layout.tsx` only wraps `AppShell` | Middleware redirect unauthenticated users; optional server layout `getUser()` gate |
| S5 | **P1** | CSP allows `'unsafe-inline'` and `'unsafe-eval'` on scripts | `next.config.ts` | Tighten CSP (nonces/hashes); drop `unsafe-eval` if Next build allows |
| S6 | **P1** | Public `/api/public/report-options` enumerates up to 500 live players + member names | `PUBLIC_REPORT_OPTIONS_MAX = 500`; no auth | Keep rate limit; consider search-as-you-type, smaller page size, captcha, or hashed/tokenized options |
| S7 | **P1** | In-memory rate limit ineffective across Netlify multi-instance | `src/lib/rate-limit.ts` comment admits this | Use Upstash Redis / Netlify Blobs / edge rate limit for public routes |
| S8 | **P2** | Prisma uses direct DB URL (bypasses Supabase RLS) | `src/lib/db.ts` | Acceptable **only if** every API path enforces authz; add automated tests that unauthenticated requests get 401 on all admin routes |
| S9 | **P2** | README still invents port 3000; app uses 8000 | `package.json` scripts vs README | Align docs |

Note: Admin `[id]` API routes **do** call `requireAuth` (earlier path-glob search was a false negative). Defense-in-depth still needs middleware.

---

## Logic / quality

| ID | Severity | Finding | Notes |
|----|----------|---------|-------|
| L1 | P1 | Opening a check-event loads **all** live members unbounded then `createMany` | Risk of huge transactions / timeouts as roster grows — batch or cap |
| L2 | P2 | No root `src/app/page.tsx` | `/` may 404; add redirect to `/members` or dashboard |
| L3 | P2 | Client services always `cache: "no-store"` | Correct for admin freshness; pair with React Query staleTime (already 30s) — OK |
| L4 | P2 | README is stock create-next-app | Replace with real domain docs (auth, env, deploy) |
| L5 | Good | Validation for age/name/URL; group inactive assignment rules; report decide flow | Keep and extend unit tests |

---

## Performance / load speed

| ID | Severity | Finding | Remediation |
|----|----------|---------|-------------|
| P1 | P1 | ~44 `"use client"` modules — most pages are client-fetched SPA style | Prefer Server Components + server data for list pages; keep forms client |
| P2 | P1 | Dashboard API always returns up to 100 members + 3 counts | Paginate dashboard table; cache counts briefly (`revalidate` / React Query) |
| P3 | P2 | Dual Google fonts (Kanit + Noto Sans Thai) | Subset weights already limited — consider one family or `display: swap` check |
| P4 | P2 | No `next/image` usage found in quick scan | Use `next/image` for any future assets |
| P5 | P2 | Netlify cold starts + Prisma adapter on each function | Keep Prisma singleton (already); consider connection pooling (pooler URL already in example) |
| P6 | Good | Pagination + query `staleTime: 30_000`, `refetchOnWindowFocus: false` | Keep |

---

## Prioritized roadmap

### P0 — do now
1. Rotate exposed DB password / review keys; scrub `.env.example`
2. Add `src/middleware.ts` wiring `updateSession`
3. Fail-closed admin allowlist in production

### P1 — this week
4. Server-side dashboard gate + auth smoke tests on every `/api/*` except `/api/public/*`
5. Harden public report endpoints (rate limit store + smaller option payload)
6. Cap/batch check-event open member fan-out
7. Move hot list pages toward RSC where possible

### P2 — polish
8. Tighten CSP; root `/` redirect; real README; Redis rate limit; image optimization

---

## Quick wins (low effort)

- Wire middleware (copy from Supabase SSR template using existing `updateSession`)
- Add `ADMIN_EMAILS=you@example.com` to env example as placeholder
- `src/app/page.tsx` → `redirect("/members")` (or primary dashboard route)
- Replace secrets in `.env.example` with `postgresql://USER:PASSWORD@HOST:6543/postgres` placeholders

---

## STATUS

**PARTIAL → P0/P1 remediation applied (2026-09-09 follow-up).**

Implemented:
- Scrubbed `.env.example` placeholders + documented `ADMIN_EMAILS`
- Confirmed / documented Next.js 16 edge guard as `src/proxy.ts` (not legacy `middleware.ts`) calling `updateSession`
- Fail-closed admin allowlist when `NODE_ENV=production` or `REQUIRE_ADMIN_ALLOWLIST=1`
- Server gate on `(dashboard)/layout.tsx` via `getUser()` + redirect
- Check-event open: member count cap + batched `createMany`
- Public report options max reduced `500 → 100`
- Dropped CSP `unsafe-eval`; real README (port 8000, env, deploy)
- Local `ADMIN_EMAILS=tenx@g2wp.com` in `.env.local`
- Optional Upstash Redis REST rate limit (`UPSTASH_REDIS_REST_*`) with in-memory fallback; public routes `await rateLimit`
- Auth smoke: `npm run smoke:auth` (admin APIs → 401 without session)

Still open / operator action:
- **Rotate DB password + review Supabase keys** if `.env.example` secrets were ever pushed
- Set `ADMIN_EMAILS=tenx@g2wp.com` on **Netlify** (CLI not linked / hung — use UI or `netlify link` then `env:set`)
- Optionally create Upstash Redis and set `UPSTASH_REDIS_REST_URL` / `TOKEN` on Netlify for multi-instance RL
- Further RSC migration for list pages (P1)
- Nonce-based CSP without `unsafe-inline` (S5 remaining)

**Do not treat as production-safe until secrets are rotated and `ADMIN_EMAILS` is set on Netlify.**

