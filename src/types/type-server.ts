export const TYPE_SERVER_KINDS = ["premium", "official"] as const;

export type TypeServerKind = (typeof TYPE_SERVER_KINDS)[number];

export const TYPE_SERVER_LABEL: Record<TypeServerKind, string> = {
  official: "Official",
  premium: "Premium",
};

export function isTypeServerKind(value: string): value is TypeServerKind {
  return value === "official" || value === "premium";
}

export type TypeServer = {
  id: string;
  type: TypeServerKind;
  isUse: boolean;
  bossCount?: number;
};

export type CreateTypeServerInput = {
  type: TypeServerKind;
  isUse?: boolean;
};

export type UpdateTypeServerInput = Partial<CreateTypeServerInput>;
