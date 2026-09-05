"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { useSidebar } from "@/context/sidebar-context";
import { useToast } from "@/context/toast-context";
import { displayHandle } from "@/lib/display";

export function AppHeader() {
  const { open, isDesktop, toggle } = useSidebar();
  const { user, loading, logout } = useAuth();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      toast.info("กำลังออกจากระบบ...");
      await logout();
    } catch (err) {
      setLoggingOut(false);
      setConfirmOpen(false);
      toast.error(
        "ออกจากระบบไม่สำเร็จ",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  const menuLabel = isDesktop
    ? open
      ? "หุบเมนูด้านข้าง"
      : "ขยายเมนูด้านข้าง"
    : open
      ? "ปิดเมนู"
      : "เปิดเมนู";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--canvas)_82%,transparent)] px-4 backdrop-blur-md md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink)] transition hover:bg-[var(--surface-hover)]"
          aria-label={menuLabel}
          aria-expanded={open}
        >
          <span className="grid gap-1.5" aria-hidden>
            <span className="block h-0.5 w-4 rounded bg-current" />
            <span className="block h-0.5 w-4 rounded bg-current" />
            <span className="block h-0.5 w-4 rounded bg-current" />
          </span>
        </button>
        <div className="min-w-0">
          <p className="truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[var(--ink)]">
            Member G2WP
          </p>
          <p className="truncate text-[11px] text-[var(--ink-muted)]">
            ระบบจัดการสมาชิก
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden max-w-[180px] truncate rounded-full border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--ink-muted)] sm:block">
          {loading ? "..." : displayHandle(user?.email) || "Guest"}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-10 px-3 text-xs"
          disabled={loggingOut}
          onClick={() => setConfirmOpen(true)}
        >
          {loggingOut ? <Spinner /> : null}
          <span className="sm:hidden">ออก</span>
          <span className="hidden sm:inline">ออกจากระบบ</span>
        </Button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="ยืนยันออกจากระบบ"
        description="ต้องการออกจากระบบตอนนี้หรือไม่?"
        confirmLabel="ออกจากระบบ"
        pending={loggingOut}
        onClose={() => {
          if (!loggingOut) setConfirmOpen(false);
        }}
        onConfirm={() => {
          void handleLogout();
        }}
      />
    </header>
  );
}
