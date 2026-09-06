"use client";

import { ReportsTable } from "@/components/reports/reports-table";

export function ReportsPageClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)]">
          รายงานพฤติกรรม
        </h1>
      </div>
      <ReportsTable />
    </div>
  );
}
