# member_warzth (WarZTH / G2WP)

แอดมินจัดการสมาชิกแคลน — สมาชิก, กลุ่ม, ตัวละคร, พฤติกรรม, รายงานสาธารณะ, อีเวนต์เช็คชื่อ, ไอเท็ม/ตู้เซฟ

Stack: Next.js 16 · React 19 · Prisma 7 · Supabase Auth/Postgres · TanStack Query · Tailwind 4 · Render

## Dev

```bash
cp .env.example .env         # ใส่ค่าจริง — ห้าม commit secrets
npm install
npm run db:up                # Postgres ใน Docker ที่ localhost:5433
npx prisma migrate deploy
npx prisma generate
npm run dev                  # http://localhost:7321
```

ฐานข้อมูล local คือ Postgres 16 ใน `docker-compose.yml` (`g2wp` / `g2wp`, ฐาน `g2wp`, พอร์ต `5433` เพื่อไม่ชน Postgres ที่อาจเปิดอยู่บนเครื่องแล้ว). ข้อมูลอยู่ใน volume `g2wp_pgdata`. หยุดด้วย `npm run db:down` (volume ยังอยู่). ล็อกอินยังใช้ Supabase Auth ตามคีย์ใน `.env`

## Env ที่ต้องมี

| ตัวแปร | ความหมาย |
|--------|----------|
| `DATABASE_URL` | Postgres pooler (แอป) |
| `DIRECT_URL` | Postgres direct (migrate) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `ADMIN_EMAILS` | อีเมลแอดมิน คั่นด้วย `,` — นอกรายการนี้เป็นผู้ใช้ปกติ เปิดได้แค่หน้า `/` |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | (ไม่บังคับ) rate limit ข้าม instance |

## Auth / ขอบเขตสาธารณะ

- Edge guard: `src/proxy.ts` → `updateSession` (Next.js 16 ใช้ชื่อ Proxy แทน Middleware)
- แอดมิน: อีเมลอยู่ใน `ADMIN_EMAILS` ใช้ทุกหน้าและทุก API จัดการ
- ผู้ใช้ปกติ: ล็อกอินแล้วเปิดได้แค่ `/` (แดชบอร์ดอ่านอย่างเดียว)
- สาธารณะ: `/report`, `/api/public/*`, `/login`

## Deploy (Render)

Web Service (Node) — long-lived process so the boss-board watch (`setInterval` 15s) keeps running.

```bash
# Build command
npm ci && npm run build:release

# Start command
npm start   # listens on $PORT (Render) or 7321 locally
```

ตั้ง env บน Render ให้ครบอย่างน้อย: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_*`, `ADMIN_EMAILS`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `REDIS_URL` (แนะนำ)

**บอทแจ้งเตือน:** บน Web Service ที่ไม่ sleep ไม่ต้องมี Cron — `instrumentation` สแกนเองทุก 15 วินาที  
ถ้าใช้ฟรีเทียร์ที่ sleep หรืออยาก backup ให้สร้าง Render Cron Job ยิง  
`POST https://YOUR_SERVICE.onrender.com/api/internal/boss-board-scan`  
พร้อม `Authorization: Bearer $CRON_SECRET` ทุกนาที (ดู `render.yaml`)

## Scripts

| Script | ใช้ทำอะไร |
|--------|-----------|
| `npm run db:up` | เปิด Postgres ใน Docker |
| `npm run db:down` | หยุด Postgres (ข้อมูลใน volume ยังอยู่) |
| `npm run dev` | พัฒนาพอร์ต 7321 |
| `npm run build` | generate + build |
| `npm run build:release` | migrate + generate + build |
| `npm run db:deploy` | `prisma migrate deploy` |
| `npm run smoke:auth` | ตรวจว่า API แอดมินบล็อกเมื่อไม่ล็อกอิน |

```bash
# local (ต้องมี npm run dev)
npm run smoke:auth

# production
SMOKE_BASE_URL=https://YOUR_SERVICE.onrender.com npm run smoke:auth
```

## Security notes

- `.env.example` ต้องเป็น placeholder เท่านั้น
- ถ้าเคยใส่รหัสจริงใน git → **หมุนรหัส DB / ทบทวน keys ทันที**
