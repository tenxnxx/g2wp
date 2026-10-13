# Work Log

## 2026-10-13 15:55 — ปรับ deploy เป็น Render

ทำอะไร/ผล: `npm start` ใช้ `$PORT`, ลบ Netlify scheduled function, เพิ่ม `render.yaml` + README สำหรับ Web Service / Cron backup — บน Render ที่ค้าง process บอทวิ่งจาก interval 15s ไม่ต้องพึ่ง Netlify

ไฟล์ที่เกี่ยว: `package.json`, `render.yaml`, `README.md`, `.env.example`, `netlify.toml`

ขั้นถัดไป: บน Render ยืนยัน Start Command = `npm start` และ service ไม่ sleep (หรือตั้ง Cron + CRON_SECRET)

## 2026-10-13 15:50 — Netlify cron + throttle Telegram

ทำอะไร/ผล: API `/api/internal/boss-board-scan` + `CRON_SECRET`, scheduled function ทุกนาที, ปิด setInterval บน NETLIFY, คิวส่ง Telegram หน่วง 350ms, retry ready คงไว้

ไฟล์ที่เกี่ยว: `boss-board-watch.ts`, `cron-auth.ts`, `api/internal/boss-board-scan`, `netlify/functions/boss-board-watch.mts`, `telegram.ts`, `middleware.ts`, `.env.example`

ขั้นถัดไป: ตั้ง `CRON_SECRET` บน Netlify แล้ว deploy — ดู log ฟังก์ชัน `boss-board-watch` ทุกนาที

## 2026-10-13 15:45 — ตรวจบอท hour-soon / เกิดแล้ว

ทำอะไร/ผล: เงื่อนไขเวลา ICT ถูกต้อง (≤5 นาที → 🟡, ครบ 1ชม → ย้าย ready + 🟢), dedupe Redis แยก key; แก้บัค promote แล้ว notify พลาดไม่ retry — ตอนนี้ยิงซ้ำตอน lane=ready จนกว่าส่งสำเร็จ

ไฟล์ที่เกี่ยว: `boss-board-watch.ts`, `bosses.ts`, `notify/index.ts`

ขั้นถัดไป: บน Netlify ยืนยันว่า instrumentation + setInterval ยังวิ่ง (serverless อาจไม่ค้าง timer) — ถ้าเงียบต้องใช้ scheduled ping

## 2026-10-13 15:30 — รีทราย PATCH 409 ตอนลาก

ทำอะไร/ผล: ตอน conflict ซิงก์ revision จากเซิร์ฟเวอร์แล้วลองเขียน lane เดิมอีกครั้ง (สูงสุด 1 ครั้ง) — ลด spam 409 จากแคช/live คลาด revision

ไฟล์ที่เกี่ยว: `src/components/bosses/boss-table.tsx`

ขั้นถัดไป: hard refresh แล้วลากข้ามคอลัมน์ — ควรเห็น 409 แล้วตามด้วย 200 ไม่ toast ถ้า retry สำเร็จ

## 2026-10-13 15:25 — เก็บ P0–P2 บอร์ดบอส

ทำอะไร/ผล: คิว PATCH latest-wins + expectedUpdatedAt/409, ตัด client hour-soon, watch notify ขนาน, cache v2 เช็ค gen, live patch ใบเดียวไม่ refetch ทั้งบอร์ด, staleTime ฟิลเตอร์

ไฟล์ที่เกี่ยว: `boss-table.tsx`, `cache.ts`, `live.ts`, `live-publish.ts`, `live-channel.ts`, `use-live-topic.ts`, `boss-board-watch.ts`, `api/bosses/[id]/route.ts`

ขั้นถัดไป: hard refresh แล้วลองลากข้ามแท็บ / ลากเร็วติดกัน

## 2026-10-13 15:15 — แก้การ์ดหายตอนลาก

ทำอะไร/ผล: สาเหตุหลักคือ PATCH ซ้อน + onError rollback ทั้งกระดาน / onSuccess เก่าทับของใหม่ — ใช้ seq ต่อใบ, rollback ทีละใบ, ลิสต์จากเซิร์ฟเวอร์เป็นตัวกำหนดสมาชิก, ตัด expectedUpdatedAt ตอนลาก

ไฟล์ที่เกี่ยว: `src/components/bosses/boss-table.tsx`

ขั้นถัดไป: hard refresh แล้วลากข้ามคอลัมน์หลายครั้งติดกัน

## 2026-10-13 15:10 — บอร์ดลากเรียบ + ตัด auto PATCH client

ทำอะไร/ผล: ตัด client auto-lane (server watch เป็นตัวย้าย), จำ missing ใน sessionStorage, pause live ตอนลาก/pending, concurrency `expectedUpdatedAt`, ghost ลากเรียบง่ายไม่มี ring/rotate

ไฟล์ที่เกี่ยว: `boss-table.tsx`, `use-live-topic.ts`, `bosses.service.ts`, `api/bosses/[id]/route.ts`

ขั้นถัดไป: รีเฟรชบอร์ด ลองลากข้ามคอลัมน์ — ไม่ควรมี PATCH 404 ของ id ผี

## 2026-10-13 14:56 — แก้ PATCH บอส 404 ซ้ำ

ทำอะไร/ผล: id ใน log ไม่มีใน DB แล้ว แต่ client ยัง PATCH จากแคชเก่า + restore `previous` ดึงการ์ดผีกลับ / saveLane retry ยิง 404 คู่ — ตัด missing ออกจาก board, ไม่ retry ตอนไม่พบบอส, กรองตอน rollback

ไฟล์ที่เกี่ยว: `src/components/bosses/boss-table.tsx`

ขั้นถัดไป: รีเฟรชบอร์ดแล้วลองลาก — ควรไม่เห็น PATCH 404 ของ id เดิม

## 2026-10-13 14:30 — ตรวจโฟลบอส/คอขวด

ทำอะไร/ผล: รวม watch เป็นสแกนเดียว, รองรับพลาดหน้าต่าง ready, server เคลียร์ ready→not, แก้ clockForGroup ให้ใช้ ICT และ over ชี้ช่วงถูก

ไฟล์ที่เกี่ยว: `src/server/boss-board-watch.ts`, `src/lib/bosses.ts`, `src/instrumentation.ts`

ขั้นถัดไป: รีสตาร์ท `npm run dev` หนึ่งครั้ง

## 2026-10-13 14:20 — แก้บอทไม่แจ้ง เกิดแล้ว ตอนครบ 1 ชม.

ทำอะไร/ผล: แจ้งเตือน wait→ready พึ่งแท็บบอร์ด + `after()` จึงพลาดได้ เพิ่ม server watch ย้ายเลนและส่ง Telegram ทุก 15 วินาที ปรับ notify ให้จำสำเร็จต่อนาฬิกาและรอส่งก่อนจบ PATCH — ทดสอบย้าย `board_lane` เป็น ready สำเร็จ

ไฟล์ที่เกี่ยว: `src/server/boss-auto-ready.ts`, `src/server/notify/index.ts`, `src/server/notify/telegram.ts`, `src/app/api/bosses/[id]/route.ts`, `src/instrumentation.ts`

ขั้นถัดไป: รีสตาร์ท `npm run dev` แล้วรอบอสครบ 1 ชม. ตรวจข้อความ 🟢 เกิดแล้ว

## 2026-10-11 19:42 — แก้ 500 ของ cities/servers/type-servers

ทำอะไร/ผล: สาเหตุคือ Turbopack HMR ทำให้ `withDbRetry` จาก import ตรงใน `cache.ts` กลายเป็น `undefined` → 500 แก้ด้วย dynamic import ใน `remember` และเพิ่ม mutex ตอน reconnect พูล DB หลังรีสตาร์ท `:7000` API ทั้งสามและ board คืน 200

ไฟล์ที่เกี่ยว: `src/lib/cache.ts`, `src/lib/db.ts`

ขั้นถัดไป: รีเฟรช `/bosses` ถ้ายังค้าง error เก่าใน React Query

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
