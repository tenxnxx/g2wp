import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--ink)] hover:bg-[var(--accent-strong)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_40%,transparent)]",
  secondary:
    "bg-[var(--surface-raised)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--surface-hover)]",
  ghost:
    "bg-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
