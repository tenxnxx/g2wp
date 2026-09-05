"use client";

import { useToast, type ToastVariant } from "@/context/toast-context";

const variantStyles: Record<
  ToastVariant,
  { bar: string; icon: string; label: string }
> = {
  success: {
    bar: "bg-[var(--accent)]",
    icon: "text-[var(--accent-strong)]",
    label: "สำเร็จ",
  },
  error: {
    bar: "bg-[var(--danger)]",
    icon: "text-[var(--danger)]",
    label: "ผิดพลาด",
  },
  info: {
    bar: "bg-[var(--ink-muted)]",
    icon: "text-[var(--ink-muted)]",
    label: "แจ้งเตือน",
  },
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") {
    return (
      <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.25a1 1 0 0 1-1.43.01L3.29 9.86a1 1 0 1 1 1.42-1.41l3.05 3.07 6.49-6.54a1 1 0 0 1 1.454.01Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm2.47-10.53a.75.75 0 0 0-1.06 0L10 8.94 8.59 7.47a.75.75 0 1 0-1.06 1.06L8.94 10l-1.41 1.47a.75.75 0 1 0 1.06 1.06L10 11.06l1.41 1.47a.75.75 0 1 0 1.06-1.06L11.06 10l1.41-1.47a.75.75 0 0 0 0-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-4.25a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-1.5 0v4.5ZM10 6.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => {
        const style = variantStyles[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto animate-[toastIn_220ms_ease-out] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_16px_40px_-20px_rgba(15,23,42,0.45)]"
          >
            <div className={`h-1 w-full ${style.bar}`} />
            <div className="flex items-start gap-3 px-3.5 py-3">
              <span
                className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-raised)] ${style.icon}`}
              >
                <ToastIcon variant={toast.variant} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  {style.label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--ink)]">
                  {toast.title}
                </p>
                {toast.description ? (
                  <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md px-1.5 py-0.5 text-xs text-[var(--ink-faint)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
                aria-label="ปิดการแจ้งเตือน"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
