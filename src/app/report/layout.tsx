import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "แจ้งพฤติกรรม | G2WP",
  description: "ส่งรายงานพฤติกรรมสมาชิกแคลนแบบนิรนาม",
};

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-[var(--bg)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_55%)]" />
      <div className="relative mx-auto flex min-h-svh w-full max-w-lg flex-col px-4 py-10 sm:px-6">
        <header className="mb-8 text-center">
          <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
            G2WP
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            แจ้งพฤติกรรมสมาชิก · ไม่ระบุตัวตน
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}
