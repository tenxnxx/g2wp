# Work Log

## 2026-10-05 15:35 — ปรับให้รับคนพร้อมกัน

ทำอะไร/ผล: จำผลการตรวจล็อกอิน 15 วินาที, ข้ามไอคอนใน proxy, ล็อกแถวรอบทีมตอนย้ายผู้เล่น, กันแคชเขียนทับหลังมีการบันทึก, จำกัดจำนวนครั้งพร้อมตั้งอายุคีย์, จำกัดพูล Postgres ที่ 5, บอร์ดทีมดึงใหม่ทุก 4 วินาที

ไฟล์ที่เกี่ยว: `src/lib/auth-snapshot.ts`, `src/lib/cache.ts`, `src/lib/rate-limit.ts`, `src/lib/db.ts`, `src/lib/team-board.ts`, `src/components/teams/teams-page-client.tsx`, `src/proxy.ts`

ขั้นถัดไป: รีสตาร์ท `npm run dev` หนึ่งครั้ง แล้วหมุนรหัส Redis ในแดชบอร์ดของผู้ให้บริการ

## 2026-10-05 15:20 — ตรวจระบบรับคนพร้อมกัน

ทำอะไร/ผล: สรุปคอขวดจาก log dev และโค้ด สิทธิ์ถูกถามซ้ำทุกคลิก ช่องทีมแข่งกันแล้วเกินจำนวนได้ แคชอาจเขียนทับผลใหม่ ลำดับแก้อยู่ในแคนวาสตรวจระบบ

ไฟล์ที่เกี่ยว: `src/proxy.ts`, `src/lib/api-auth.ts`, `src/lib/team-board.ts`, `src/lib/cache.ts`, `src/lib/db.ts`

ขั้นถัดไป: เริ่มจากลด getUser ซ้ำ แล้วล็อกช่องทีมในธุรกรรมเดียว

## 2026-10-05 15:05 — แคช Redis

ทำอะไร/ผล: ต่อ Redis แล้วแคชผลอ่านของหน้ารายการ แดชบอร์ด จัดทีม และตัวเลือกฟอร์มสาธารณะ ตอนบันทึกจะล้างแคชของหน้าที่เกี่ยวข้อง เบราว์เซอร์จำผลล่าสุด 60 วินาที

ไฟล์ที่เกี่ยว: `src/lib/redis.ts`, `src/lib/cache.ts`, `src/lib/rate-limit.ts`, `src/app/api/**`, `.env.example`

ขั้นถัดไป: รีสตาร์ท `npm run dev` หนึ่งครั้ง เพื่อให้โปรเซสอ่าน `REDIS_URL`

## 2026-10-05 13:48 — ย้ายตำแหน่งกล่องทีม

ทำอะไร/ผล: ลากปุ่ม ⠿ บนกล่องทีมหรือกล่องสำรองเพื่อสลับลำดับ แถวหลักกับแถวสำรองขยับพร้อมกัน

ไฟล์ที่เกี่ยว: `src/lib/team-board.ts`, `src/app/api/teams/board/route.ts`, `src/components/teams/teams-page-client.tsx`

ขั้นถัดไป: รีเฟรช `/teams` แล้วลากกล่องทีม

## 2026-10-05 13:40 — ปรับจำนวนคนในทีม

ทำอะไร/ผล: แต่ละทีมกำหนดจำนวนคนหลักและสำรองเองได้จากหน้าต่างแก้ไขทีม ค่าเดิมคือ 5 และ 3 ลดต่ำกว่าจำนวนผู้เล่นที่อยู่ในช่องไม่ได้

ไฟล์ที่เกี่ยว: `prisma/schema.prisma`, `prisma/migrations/20261005153000_team_slot_limits`, `src/lib/team-board.ts`, `src/components/teams/teams-page-client.tsx`

ขั้นถัดไป: รีเฟรช `/teams` แล้วกดแก้ไขเพื่อเปลี่ยนจำนวนช่อง

## 2026-10-05 13:35 — แก้ไขชื่อทีม

ทำอะไร/ผล: การ์ดทีมกดแก้ไขแล้วเปลี่ยนชื่อได้ ชื่อซ้ำกับทีมที่ใช้งานอยู่บันทึกไม่ได้

ไฟล์ที่เกี่ยว: `src/lib/team-board.ts`, `src/app/api/teams/board/route.ts`, `src/components/teams/teams-page-client.tsx`

ขั้นถัดไป: รีเฟรช `/teams` แล้วกดแก้ไขที่การ์ดทีม

## 2026-10-05 13:30 — หน้าจัดทีม

ทำอะไร/ผล: เพิ่ม `/teams` และ `POST/GET /api/teams/board` ให้จัดผู้เล่นเป็นรอเล่น หลัก สำรอง หรือไม่เล่น รอบเก่าไม่หายเมื่อจบรอบ

ไฟล์ที่เกี่ยว: `src/lib/team-board.ts`, `src/app/api/teams/board/route.ts`, `src/components/teams/teams-page-client.tsx`, `src/components/layout/app-sidebar.tsx`

ขั้นถัดไป: ลองลากผู้เล่นบน `/teams` หลังล็อกอินแอดมิน

## 2026-10-05 13:20 — schema จัดทีม

ทำอะไร/ผล: เพิ่ม `teams`, `team_sessions`, `team_assignments` และ enum slot/status โดยไม่แตะตารางเดิม migration `20261005140000_add_team_management` apply แล้ว มีทีม 1–3

ไฟล์ที่เกี่ยว: `prisma/schema.prisma`, `prisma/migrations/20261005140000_add_team_management`, `scripts/seed-local.mjs`

ขั้นถัดไป: API และหน้าจัดทีม

## 2026-10-05 12:17 — ตาราง users + จัดการผู้ใช้

ทำอะไร/ผล: เพิ่มตาราง `users` ผูก id กับ Supabase Auth, sync ตอนเข้าแอป, หน้า `/users` ให้แอดมินปรับบทบาทและเปิด/ปิดใช้งานได้ อีเมลใน `ADMIN_EMAILS` ยังเป็นแอดมินถาวร

ไฟล์ที่เกี่ยว: `prisma/schema.prisma`, `prisma/migrations/20261005120000_add_users`, `src/lib/app-users.ts`, `src/lib/api-auth.ts`, `src/app/(dashboard)/users`, `src/app/api/users`

ขั้นถัดไป: เข้า `/users` หลังล็อกอินเพื่อเลื่อนขั้นบัญชีที่เคยเข้าสู่ระบบแล้ว

## 2026-10-05 12:22 — users.member_id

ทำอะไร/ผล: เพิ่ม `users.member_id` ชี้ไปที่ `members` แบบไม่บังคับ และหนึ่งสมาชิกผูกได้คนเดียว หน้าผู้ใช้เลือกสมาชิกตอนแก้ไขได้

ไฟล์ที่เกี่ยว: `prisma/schema.prisma`, `prisma/migrations/20261005123000_user_member_id`, `src/lib/app-users.ts`, `src/components/users/users-page-client.tsx`

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
