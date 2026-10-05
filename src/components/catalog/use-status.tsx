export function UseStatus({ isUse }: { isUse: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        isUse
          ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
          : "bg-[var(--surface-raised)] text-[var(--ink-muted)]"
      }`}
    >
      {isUse ? "ใช้งาน" : "ปิดใช้งาน"}
    </span>
  );
}
