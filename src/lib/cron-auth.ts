import { timingSafeEqual } from "node:crypto";

/** True when Authorization Bearer / x-cron-secret matches CRON_SECRET. */
export function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (!secret) return false;

  const header = request.headers.get("authorization")?.trim() ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const alt = request.headers.get("x-cron-secret")?.trim() ?? "";
  const provided = bearer || alt;
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
