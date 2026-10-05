export const APP_USER_ROLES = ["admin", "user"] as const;

export type AppUserRole = (typeof APP_USER_ROLES)[number];

export type AppUser = {
  id: string;
  email: string;
  role: AppUserRole;
  isUse: boolean;
  lockedByAllowlist: boolean;
  isSelf: boolean;
  memberId: string | null;
  memberName: string | null;
  lastSeenAt: string;
  createdAt: string;
};
