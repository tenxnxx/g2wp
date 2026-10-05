# member_warzth (WarZTH / G2WP)

แอดมินจัดการสมาชิกแคลน — สมาชิก, กลุ่ม, ตัวละคร, พฤติกรรม, รายงานสาธารณะ, อีเวนต์เช็คชื่อ, ไอเท็ม/ตู้เซฟ

Stack: Next.js 16 · React 19 · Prisma 7 · Supabase Auth/Postgres · TanStack Query · Tailwind 4 · Netlify

## Dev

```bash
cp .env.example .env         # ใส่ค่าจริง — ห้าม commit secrets
npm install
npm run db:up                # Postgres ใน Docker ที่ localhost:5433
npx prisma migrate deploy
npx prisma generate
npm run dev                  # http://localhost:4000
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

## Deploy (Netlify)

```bash
npm run build:release   # migrate deploy + generate + next build
```

ตั้ง env บน Netlify ให้ครบ รวม `ADMIN_EMAILS` และ `DIRECT_URL`

ตัวอย่างตั้งค่า (หลัง `netlify link`):

```bash
npx netlify env:set ADMIN_EMAILS "tenx@g2wp.com"
```

## Scripts

| Script | ใช้ทำอะไร |
|--------|-----------|
| `npm run db:up` | เปิด Postgres ใน Docker |
| `npm run db:down` | หยุด Postgres (ข้อมูลใน volume ยังอยู่) |
| `npm run dev` | พัฒนาพอร์ต 4000 |
| `npm run build` | generate + build |
| `npm run build:release` | migrate + generate + build |
| `npm run db:deploy` | `prisma migrate deploy` |
| `npm run smoke:auth` | ตรวจว่า API แอดมินบล็อกเมื่อไม่ล็อกอิน |

```bash
# local (ต้องมี npm run dev)
npm run smoke:auth

# production
SMOKE_BASE_URL=https://YOUR_SITE.netlify.app npm run smoke:auth
```

## Security notes

- `.env.example` ต้องเป็น placeholder เท่านั้น
- ถ้าเคยใส่รหัสจริงใน git → **หมุนรหัส DB / ทบทวน keys ทันที**
