import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh bg-[var(--canvas)] text-[var(--ink)]">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
