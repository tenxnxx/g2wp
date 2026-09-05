"use client";

import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/types/pagination";

type PaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
};

function getVisiblePages(current: number, total: number): Array<number | "…"> {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: Array<number | "…"> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const page = sorted[i];
    const prev = sorted[i - 1];
    if (prev !== undefined && page - prev > 1) {
      result.push("…");
    }
    result.push(page);
  }
  return result;
}

export function Pagination({ meta, onPageChange, className = "" }: PaginationProps) {
  if (meta.total === 0) return null;

  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  const pages = getVisiblePages(meta.page, meta.totalPages);

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-sm text-[var(--ink-muted)]">
        แสดง{" "}
        <span className="font-medium text-[var(--ink)]">
          {from}-{to}
        </span>{" "}
        จาก{" "}
        <span className="font-medium text-[var(--ink)]">{meta.total}</span>{" "}
        รายการ
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="secondary"
          className="h-10 px-3"
          disabled={!meta.hasPrev}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label="หน้าก่อน"
        >
          ก่อนหน้า
        </Button>

        <div className="flex flex-wrap items-center gap-1">
          {pages.map((item, index) =>
            item === "…" ? (
              <span
                key={`ellipsis-${index}`}
                className="px-1 text-sm text-[var(--ink-faint)]"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === meta.page ? "page" : undefined}
                className={`inline-flex size-10 items-center justify-center rounded-lg text-sm font-medium transition ${
                  item === meta.page
                    ? "bg-[var(--accent)] text-[var(--ink)]"
                    : "border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
                }`}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          className="h-10 px-3"
          disabled={!meta.hasNext}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label="หน้าถัดไป"
        >
          ถัดไป
        </Button>
      </div>
    </div>
  );
}
