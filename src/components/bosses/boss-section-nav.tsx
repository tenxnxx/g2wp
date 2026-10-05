"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/bosses", label: "บอส" },
  { href: "/servers", label: "เซิร์ฟเวอร์" },
  { href: "/type-servers", label: "ประเภทเซิร์ฟเวอร์" },
  { href: "/cities", label: "เมือง" },
] as const;

export function BossSectionNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="จัดการข้อมูลบอส"
      className="flex flex-wrap gap-2"
    >
      {LINKS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition ${
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
