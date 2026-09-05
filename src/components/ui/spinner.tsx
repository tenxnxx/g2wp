export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block size-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)] ${className}`}
      aria-hidden
    />
  );
}
