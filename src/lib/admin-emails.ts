/** Emails in ADMIN_EMAILS are admins. Everyone else is a normal user. */
export function adminEmailAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailAllowlist().includes(email.trim().toLowerCase());
}
