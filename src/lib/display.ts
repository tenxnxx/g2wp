/** Show local-part only when value looks like an email (drop `@domain`). */
export function displayHandle(value: string | null | undefined): string {
  if (!value) return "";
  const at = value.indexOf("@");
  if (at <= 0) return value;
  return value.slice(0, at);
}

/**
 * How long since deposit.
 * - ≥ 1 day → only days (e.g. "3 วัน")
 * - otherwise → hours + minutes (e.g. "2 ชั่วโมง 15 นาที")
 */
export function formatDepositAge(
  depositAt: string | Date,
  now: Date = new Date(),
): string {
  const start = depositAt instanceof Date ? depositAt : new Date(depositAt);
  if (Number.isNaN(start.getTime())) return "—";

  const ms = Math.max(0, now.getTime() - start.getTime());
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));

  if (days >= 1) {
    return `${days} วัน`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 1) {
    if (minutes === 0) return `${hours} ชั่วโมง`;
    return `${hours} ชั่วโมง ${minutes} นาที`;
  }

  if (minutes <= 0) return "เพิ่งฝาก";
  return `${minutes} นาที`;
}

