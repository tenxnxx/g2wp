import type { ReactNode } from "react";

type EmptyStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({
  title = "ไม่มีข้อมูล",
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-raised)] text-lg text-[var(--ink-faint)]">
        ∅
      </div>
      <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--ink)]">
        {title}
      </p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-[var(--ink-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
