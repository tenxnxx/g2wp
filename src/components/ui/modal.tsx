"use client";

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** When true, Escape / backdrop / X do not close the modal */
  closeDisabled?: boolean;
};

const subscribeNoop = () => () => undefined;

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  closeDisabled = false,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeDisabled) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose, closeDisabled]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="ปิด"
        className="absolute inset-0 bg-[color-mix(in_oklab,#000_72%,transparent)] backdrop-blur-[3px] animate-[fadeIn_180ms_ease-out]"
        onClick={() => {
          if (!closeDisabled) onClose();
        }}
        disabled={closeDisabled}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)] outline-none animate-[modalIn_220ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="relative overflow-hidden border-b border-[var(--line)] px-6 pb-5 pt-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--accent),var(--warning))]" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id={titleId}
                className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--ink)]"
              >
                {title}
              </h2>
              {description ? (
                <p
                  id={descriptionId}
                  className="mt-1 text-sm leading-6 text-[var(--ink-muted)]"
                >
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] disabled:pointer-events-none disabled:opacity-40"
              aria-label="ปิดหน้าต่าง"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <div className="border-t border-[var(--line)] bg-[var(--surface-raised)] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
