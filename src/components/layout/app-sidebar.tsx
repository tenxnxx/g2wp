"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSidebar } from "@/context/sidebar-context";

const MENU = [
  { href: "/", label: "แดชบอร์ด", hint: "Overview" },
  { href: "/members", label: "สมาชิก", hint: "Members" },
  { href: "/players", label: "ตัวละคร", hint: "Players" },
  { href: "/behaviors", label: "พฤติกรรม", hint: "Behaviors" },
  { href: "/set-dates", label: "กำหนดวันเช็ค", hint: "Dates" },
  { href: "/check-events", label: "อีเวนต์เช็คชื่อ", hint: "Check Events" },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const {
    desktopExpanded,
    mobileOpen,
    isDesktop,
    closeMobile,
  } = useSidebar();
  const showLabels = isDesktop ? desktopExpanded : mobileOpen;

  useEffect(() => {
    if (!isDesktop) closeMobile();
  }, [pathname, isDesktop, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, closeMobile]);

  return (
    <>
      <button
        type="button"
        aria-label="ปิดเมนู"
        className={`fixed inset-0 z-40 bg-[color-mix(in_oklab,#000_60%,transparent)] backdrop-blur-[2px] transition-opacity md:hidden ${
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeMobile}
      />

      <aside
        data-mobile-open={mobileOpen ? "true" : "false"}
        data-expanded={desktopExpanded ? "true" : "false"}
        className="fixed inset-y-0 left-0 z-50 flex w-60 -translate-x-full flex-col border-r border-[var(--line)] bg-[var(--sidebar)] transition-[transform,width] duration-300 ease-out data-[mobile-open=true]:translate-x-0 md:sticky md:top-0 md:z-auto md:h-svh md:w-60 md:translate-x-0 md:data-[expanded=false]:w-[4.25rem]"
      >
        <div className="flex h-14 shrink-0 items-center border-b border-[var(--line)] px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] font-[family-name:var(--font-display)] text-sm font-bold text-[var(--ink)] shadow-[0_0_20px_var(--glow)]">
            G2
          </div>
          {showLabels ? (
            <span className="ml-3 truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-[var(--ink)]">
              G2WP x WARZTH
            </span>
          ) : null}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {MENU.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (!isDesktop) closeMobile();
                }}
                className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "border border-[var(--accent)]/35 bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "border border-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
                } ${showLabels ? "" : "justify-center px-0"}`}
                title={item.label}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-md text-[11px] font-bold ${
                    active
                      ? "bg-[var(--accent)] text-[var(--ink)]"
                      : "bg-[var(--surface-raised)] text-[var(--ink-muted)]"
                  }`}
                >
                  {item.label.slice(0, 1)}
                </span>
                {showLabels ? (
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{item.label}</span>
                    <span className="truncate text-[10px] opacity-70">
                      {item.hint}
                    </span>
                  </span>
                ) : (
                  <span className="sr-only">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
