"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

type SearchableSelectOption = {
  value: string;
  label: string;
  /** Extra text used for filtering (defaults to label) */
  keywords?: string;
};

type SearchableSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "เลือก...",
  searchPlaceholder = "ค้นหา...",
  emptyMessage = "ไม่พบรายการ",
  className = "",
}: SearchableSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.keywords ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  function updatePosition() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    setHighlight((prev) => {
      if (filtered.length === 0) return 0;
      return Math.min(prev, filtered.length - 1);
    });
  }, [filtered.length]);

  function selectOption(next: string) {
    onChange(next);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!open) {
      if (
        event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((prev) =>
        filtered.length === 0 ? 0 : (prev + 1) % filtered.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((prev) =>
        filtered.length === 0
          ? 0
          : (prev - 1 + filtered.length) % filtered.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) selectOption(option.value);
    }
  }

  const menu =
    open && position
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            className="fixed z-[80] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]"
          >
            <div className="border-b border-[var(--line)] p-2">
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                aria-autocomplete="list"
                aria-controls={listboxId}
                autoComplete="off"
              />
            </div>

            <ul
              id={listboxId}
              role="listbox"
              aria-label="ตัวเลือก"
              className="max-h-60 overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-sm text-[var(--ink-muted)]">
                  {emptyMessage}
                </li>
              ) : (
                filtered.map((option, index) => {
                  const active = option.value === value;
                  const highlighted = index === highlight;
                  return (
                    <li key={option.value} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setHighlight(index)}
                        onClick={() => selectOption(option.value)}
                        className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition ${
                          highlighted
                            ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                            : "text-[var(--ink)] hover:bg-[var(--surface-hover)]"
                        } ${active ? "font-medium" : ""}`}
                      >
                        <span className="truncate">{option.label}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onKeyDown}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-left text-sm text-[var(--ink)] outline-none transition hover:bg-[var(--surface-hover)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
      >
        <span
          className={selected ? "truncate" : "truncate text-[var(--ink-faint)]"}
        >
          {selected?.label ?? placeholder}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`size-4 shrink-0 text-[var(--ink-muted)] transition ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {menu}
    </div>
  );
}
