"use client";

import { useState } from "react";
import { formatBossTime } from "@/lib/bosses";

type BossTimeFieldProps = {
  hour: number;
  minute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function wrap(value: number, size: number) {
  return (value + size) % size;
}

function ClockPart({
  label,
  value,
  size,
  onChange,
}: {
  label: string;
  value: number;
  size: number;
  onChange: (next: number) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const choices = [wrap(value - 1, size), value, wrap(value + 1, size)];

  return (
    <div className="w-full space-y-2 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
        {label}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {choices.map((choice, index) => {
          const selected = index === 1;
          return (
            <button
              key={`${label}-${index}`}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(choice)}
              className={`inline-flex h-11 min-w-14 items-center justify-center rounded-lg px-3 text-sm font-semibold tabular-nums transition ${
                selected
                  ? "bg-[var(--accent)] text-[var(--ink)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_40%,transparent)]"
                  : "border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {pad(choice)}
            </button>
          );
        })}
        <button
          type="button"
          aria-expanded={customOpen}
          onClick={() => setCustomOpen((open) => !open)}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-transparent px-3 text-sm font-medium text-[var(--ink-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
        >
          {customOpen ? "ปิด" : "อื่น"}
        </button>
      </div>
      {customOpen ? (
        <div
          className="grid max-h-40 w-full grid-cols-6 gap-1.5 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-2 text-center sm:grid-cols-8"
          role="listbox"
          aria-label={`เลือก${label}`}
        >
          {Array.from({ length: size }, (_, choice) => {
            const selected = choice === value;
            return (
              <button
                key={choice}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(choice);
                  setCustomOpen(false);
                }}
                className={`inline-flex h-9 items-center justify-center rounded-md text-sm tabular-nums transition ${
                  selected
                    ? "bg-[var(--accent)] font-semibold text-[var(--ink)]"
                    : "text-[var(--ink)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {pad(choice)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function BossTimeField({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: BossTimeFieldProps) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 text-center">
      <legend className="mx-auto w-fit px-1 text-center text-sm font-medium text-[var(--ink)]">
        เวลาบอสตาย *
      </legend>
      <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-tight text-[var(--ink)]">
        {formatBossTime(hour, minute)}
      </p>
      <ClockPart label="ชั่วโมง" value={hour} size={24} onChange={onHourChange} />
      <ClockPart label="นาที" value={minute} size={60} onChange={onMinuteChange} />
    </fieldset>
  );
}
