"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsAdmin } from "@/context/role-context";

const LINKS = [
  { href: "/bosses", label: "บอส" },
  { href: "/servers", label: "เซิร์ฟเวอร์" },
  { href: "/type-servers", label: "ประเภทเซิร์ฟเวอร์" },
  { href: "/cities", label: "เมือง" },
] as const;

export function BossSectionNav() {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;

  return (
    <nav
      aria-label="จัดการข้อมูลบอส"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {LINKS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-11 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-medium whitespace-nowrap transition ${
              active
                ? "bg-[var(--accent)] text-[var(--ink)]"
                : "border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
