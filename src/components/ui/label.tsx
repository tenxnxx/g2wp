import type { LabelHTMLAttributes, ReactNode } from "react";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
};

export function Label({ className = "", children, ...props }: LabelProps) {
  return (
    <label
      className={`mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)] ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
