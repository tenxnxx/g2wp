/** Show local-part only when value looks like an email (drop `@domain`). */
export function displayHandle(value: string | null | undefined): string {
  if (!value) return "";
  const at = value.indexOf("@");
  if (at <= 0) return value;
  return value.slice(0, at);
}
