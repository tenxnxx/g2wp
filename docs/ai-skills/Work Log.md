# Work Log

## 2026-09-06 17:13 — Production hardening (P0/P1)

ทำอะไร/ผล: ลงมือแก้ตาม production-readiness audit — scrub `.env.example`, admin allowlist (`ADMIN_EMAILS`), ปิด open redirect, rate limit + take บน `/api/public/*`, ตรวจ player↔member ตอน approve, double-submit/idempotency, field limits, dashboard/member detail `take`, modal `closeDisabled` ตอน pending, security headers, `build:release` + migrate บน Netlify

ไฟล์ที่เกี่ยว: `.env.example`, `.gitignore`, `src/lib/api-auth.ts`, `src/lib/safe-next-path.ts`, `src/lib/rate-limit.ts`, `src/lib/field-limits.ts`, `src/lib/pagination.ts`, `src/lib/db.ts`, public/report APIs, form modals, `next.config.ts`, `netlify.toml`, `package.json`

ขั้นถัดไป: ตั้ง `ADMIN_EMAILS` ใน production · หมุนรหัส DB/Supabase ถ้าเคยรั่วใน `.env.example` · ยืนยัน `DIRECT_URL` บน Netlify สำหรับ `migrate deploy`

## 2026-09-06 17:30 — ESLint clean

ทำอะไร/ผล: แก้ ESLint 25 จุดให้ผ่าน (`--max-warnings 0`) — เลิก setState-in-effect, form remount ด้วย `key`, pagination clamp ตอน render, auth ใช้ `router.replace`, modal ใช้ `useSyncExternalStore`

Verified: `npx eslint src --max-warnings 0` · `npm run build`

## 2026-09-09 17:50 — Audit remediation (Tester)

ทำอะไร/ผล: ตาม `docs/project-audit-2026-09-09.md` — scrub `.env.example`, confirm `src/proxy.ts` edge guard, fail-closed `ADMIN_EMAILS` ใน production, dashboard layout `getUser` gate, check-event open batch+cap, public options 100, drop CSP unsafe-eval, README จริง

ขั้นถัดไป: หมุนรหัส DB/keys ถ้าเคยรั่ว · ตั้ง `ADMIN_EMAILS` บน Netlify

## 2026-09-09 18:00 — Operator follow-up

ทำอะไร/ผล: ตั้ง `ADMIN_EMAILS=tenx@g2wp.com` ใน `.env.local` · Upstash-ready async rate limit + wire public APIs · `scripts/smoke-auth.mjs` (`npm run smoke:auth` ผ่าน 13/13) · อัปเดต `.env.example` / README

Verified: `tsc --noEmit` · smoke:auth local

ขั้นถัดไป: ตั้ง `ADMIN_EMAILS` บน Netlify UI · (ถ้าต้องการ) Upstash Redis · หมุน secrets ถ้าเคยรั่ว
