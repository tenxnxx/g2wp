"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { EMPTY_ARRAY } from "@/lib/empty";
import { compareServerName } from "@/lib/servers";
import {
  BOSS_BOX_STATUS,
  bossElapsedMs,
  bossHourAlmostDone,
  bossTimeGroup,
  clockForGroup,
  bossWindowCopy,
  type BossTimeGroup,
  bossLaneClock,
  formatBossTime,
} from "@/lib/bosses";
import { subscribeBossClock } from "@/components/bosses/use-boss-clock";
import { useLiveTopic } from "@/components/live/use-live-topic";
import { bossesService } from "@/services/bosses.service";
import { citiesService } from "@/services/cities.service";
import { serversService } from "@/services/servers.service";
import { typeServersService } from "@/services/type-servers.service";
import type { Boss, BossBoardLane } from "@/types/boss";
import { TYPE_SERVER_LABEL } from "@/types/type-server";

type BossTableProps = {
  onEdit: (item: Boss) => void;
};

function boardGroupKey(rows: readonly Boss[], at: number) {
  let key = "";
  for (const row of rows) {
    key += row.id;
    key += bossTimeGroup(row, at);
    key += "\n";
  }
  return key;
}

function cardElapsed(item: Boss, now: number): number {
  if (item.hour == null || item.minute == null) return 0;
  return bossElapsedMs(
    { hour: item.hour, minute: item.minute, second: item.second },
    now,
  );
}

type LaneWrite = {
  boardLane: BossBoardLane | null;
  hour: number | null;
  minute: number | null;
  second: number | null;
  autoReady?: boolean;
};

type PendingMove = LaneWrite & { at: number };

const pendingMoves = new Map<string, PendingMove>();
const quietMoves = new Set<string>();
const missingBosses = new Set<string>();
const retryAt = new Map<string, number>();
/** Bosses whose database kept the clock after a clear, so we do not retry forever. */
const keptClocks = new Set<string>();
const laneInflight = new Map<string, { at: number; request: Promise<Boss> }>();

async function saveLane(id: string, write: LaneWrite): Promise<Boss> {
  const clearingClock = write.hour == null && write.minute == null && write.second == null;
  try {
    return await bossesService.update(id, write);
  } catch (error) {
    if (!clearingClock || write.boardLane == null) throw error;
    try {
      return await bossesService.update(id, { boardLane: write.boardLane });
    } catch {
      throw error;
    }
  }
}

function sameLaneWrite(a: LaneWrite, b: LaneWrite) {
  return (
    a.boardLane === b.boardLane &&
    a.hour === b.hour &&
    a.minute === b.minute &&
    a.second === b.second
  );
}

/** A list refetch that started before a save must not roll the card backwards. */
function shareBossBoard(oldData: unknown, newData: unknown): Boss[] {
  if (!Array.isArray(newData)) return [];
  if (!Array.isArray(oldData)) return newData as Boss[];
  const previous = new Map((oldData as Boss[]).map((row) => [row.id, row]));
  return (newData as Boss[]).map((row) => {
    const prior = previous.get(row.id);
    if (prior && prior.updatedAt > row.updatedAt) return prior;
    return row;
  });
}

function BossElapsed({
  hour,
  minute,
  second,
  boardLane,
  className,
}: {
  hour: number;
  minute: number;
  second: number;
  boardLane: Boss["boardLane"];
  className: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const clock = bossLaneClock({ hour, minute, second, boardLane });

  useEffect(() => {
    const paint = (at: number) => {
      const node = ref.current;
      if (!node) return;
      const next = bossLaneClock({ hour, minute, second, boardLane }, at);
      node.textContent = next.text;
      node.style.color =
        next.tone === "late"
          ? "var(--danger)"
          : next.tone === "early"
            ? "var(--accent-strong)"
            : "";
    };
    paint(Date.now());
    return subscribeBossClock((at) => paint(at));
  }, [boardLane, hour, minute, second]);

  return (
    <p
      ref={ref}
      className={className}
      style={
        clock.tone === "late"
          ? { color: "var(--danger)" }
          : clock.tone === "early"
            ? { color: "var(--accent-strong)" }
            : undefined
      }
      suppressHydrationWarning
    >
      {clock.text}
    </p>
  );
}

export function BossTable({ onEdit }: BossTableProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  useLiveTopic("bosses");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cityId, setCityId] = useState("");
  const [serverId, setServerId] = useState("");
  const [typeServerId, setTypeServerId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Boss | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTone, setDropTone] = useState<BossTimeGroup | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const [layoutNow, setLayoutNow] = useState(() => Date.now());

  const listQuery = useQuery({
    queryKey: ["bosses", "board", search, cityId, serverId, typeServerId],
    queryFn: () =>
      bossesService.listAll({
        q: search,
        cityId: cityId || undefined,
        serverId: serverId || undefined,
        typeServerId: typeServerId || undefined,
      }),
    placeholderData: (previous) => previous,
    structuralSharing: shareBossBoard,
  });

  const citiesQuery = useQuery({
    queryKey: ["cities", "filters"],
    queryFn: () => citiesService.list({ page: 1, limit: 200 }),
  });
  const serversQuery = useQuery({
    queryKey: ["servers", "filters"],
    queryFn: () => serversService.list({ page: 1, limit: 200 }),
  });
  const typesQuery = useQuery({
    queryKey: ["type-servers", "filters"],
    queryFn: () => typeServersService.list({ page: 1, limit: 200 }),
  });

  const cityOptions = useMemo(
    () => [
      { value: "", label: "ทุกเมือง" },
      ...(citiesQuery.data?.data ?? EMPTY_ARRAY).map((row) => ({
        value: row.id,
        label: row.cityName,
      })),
    ],
    [citiesQuery.data?.data],
  );
  const serverOptions = useMemo(() => {
    const rows = [...(serversQuery.data?.data ?? EMPTY_ARRAY)].toSorted((a, b) =>
      compareServerName(a.serverName, b.serverName),
    );
    return [
      { value: "", label: "ทุกเซิร์ฟเวอร์" },
      ...rows.map((row) => ({
        value: row.id,
        label: row.serverName,
      })),
    ];
  }, [serversQuery.data?.data]);
  const typeOptions = useMemo(
    () => [
      { value: "", label: "ทุกประเภท" },
      ...(typesQuery.data?.data ?? EMPTY_ARRAY).map((row) => ({
        value: row.id,
        label: TYPE_SERVER_LABEL[row.type],
        keywords: `${row.type} ${TYPE_SERVER_LABEL[row.type]}`,
      })),
    ],
    [typesQuery.data?.data],
  );

  const items = listQuery.data ?? EMPTY_ARRAY;
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const warnedHourSoon = useRef(new Set<string>());

  useEffect(() => {
    return subscribeBossClock((at) => {
      for (const item of itemsRef.current) {
        if (missingBosses.has(item.id) || item.hour == null || item.minute == null) continue;
        if (!bossHourAlmostDone(item, at)) continue;
        const mark = `${item.id}:${item.hour}:${item.minute}:${item.second ?? 0}`;
        if (warnedHourSoon.current.has(mark)) continue;
        warnedHourSoon.current.add(mark);
        void bossesService
          .warnHourSoon(item.id)
          .then((result) => {
            if (!result.sent) warnedHourSoon.current.delete(mark);
          })
          .catch((error: unknown) => {
            if (error instanceof Error && error.message === "ไม่พบบอส") {
              missingBosses.add(item.id);
              return;
            }
            warnedHourSoon.current.delete(mark);
          });
      }
    });
  }, []);

  useEffect(() => {
    return subscribeBossClock((next) => {
      const rows = itemsRef.current;
      setLayoutNow((prev) =>
        boardGroupKey(rows, prev) === boardGroupKey(rows, next) ? prev : next,
      );
    });
  }, []);

  const ordered = [...items].sort((a, b) => cardElapsed(b, layoutNow) - cardElapsed(a, layoutNow));
  const overdue = ordered.filter((item) => bossTimeGroup(item, layoutNow) === "over");
  const recent = ordered.filter((item) => bossTimeGroup(item, layoutNow) === "fresh");
  const upcoming = ordered.filter((item) => bossTimeGroup(item, layoutNow) === "upcoming");

  const boardKey = ["bosses", "board", search, cityId, serverId, typeServerId] as const;
  const [moveEpoch, setMoveEpoch] = useState(0);

  const laneMutation = useMutation({
    mutationFn: ({ id, ...write }: { id: string } & LaneWrite) => {
      const key = `${id}|${write.boardLane ?? ""}|${write.hour ?? ""}|${write.minute ?? ""}`;
      const current = laneInflight.get(key);
      if (current && Date.now() - current.at < 1500) return current.request;
      const request = saveLane(id, write).finally(() => {
        const latest = laneInflight.get(key);
        if (latest?.request === request) laneInflight.delete(key);
      });
      laneInflight.set(key, { at: Date.now(), request });
      return request;
    },
    onMutate: ({ id, boardLane, hour, minute, second }) => {
      const previous = queryClient.getQueryData<Boss[]>(boardKey);
      queryClient.setQueryData<Boss[]>(boardKey, (rows) =>
        rows?.map((row) =>
          row.id === id ? { ...row, boardLane, hour, minute, second } : row,
        ),
      );
      return { previous };
    },
    onSuccess: (boss, vars) => {
      pendingMoves.delete(boss.id);
      if (vars.hour == null && vars.minute == null && boss.hour != null) {
        keptClocks.add(boss.id);
      } else if (vars.hour != null) {
        keptClocks.delete(boss.id);
      }
      queryClient.setQueryData<Boss[]>(boardKey, (rows) =>
        rows?.map((row) => (row.id === boss.id ? boss : row)),
      );
    },
    onError: (err: Error, vars, context) => {
      pendingMoves.delete(vars.id);
      if (err.message === "ไม่พบบอส") {
        missingBosses.add(vars.id);
        queryClient.setQueryData<Boss[]>(boardKey, (rows) =>
          rows?.filter((row) => row.id !== vars.id),
        );
        return;
      }
      if (context?.previous) queryClient.setQueryData(boardKey, context.previous);
      if (quietMoves.has(vars.id)) {
        quietMoves.delete(vars.id);
        retryAt.set(vars.id, Date.now() + 3000);
        window.setTimeout(() => setMoveEpoch((value) => value + 1), 3000);
        return;
      }
      toast.error("ย้ายการ์ดไม่สำเร็จ", err.message);
    },
  });

  const writeLaneRef = useRef<
    (item: Boss, write: LaneWrite, quiet: boolean) => void
  >(() => {});

  useEffect(() => {
    writeLaneRef.current = (item, write, quiet) => {
      const current = pendingMoves.get(item.id);
      if (current && sameLaneWrite(current, write) && Date.now() - current.at < 8000) return;
      pendingMoves.set(item.id, { ...write, at: Date.now() });
      if (quiet) quietMoves.add(item.id);
      else quietMoves.delete(item.id);
      laneMutation.mutate({ id: item.id, ...write });
    };
  }, [laneMutation]);

  useEffect(() => {
    for (const item of items) {
      const pending = pendingMoves.get(item.id);
      if (
        draggingId === item.id ||
        missingBosses.has(item.id) ||
        (pending && Date.now() - pending.at < 8000)
      ) {
        continue;
      }
      const cooledUntil = retryAt.get(item.id) ?? 0;
      if (cooledUntil > Date.now()) continue;
      const group = bossTimeGroup(item, layoutNow);
      const elapsed = cardElapsed(item, layoutNow);
      const nextLane =
        group === "upcoming" && item.boardLane !== "ready" && item.boardLane !== "not"
          ? "ready"
          : group === "over" && item.boardLane !== "not" && elapsed >= 0
            ? "not"
            : null;
      if (
        !keptClocks.has(item.id) &&
        item.boardLane === "not" &&
        item.hour != null &&
        item.minute != null &&
        elapsed >= 0
      ) {
        writeLaneRef.current(
          item,
          { boardLane: "not", hour: null, minute: null, second: null },
          true,
        );
        continue;
      }
      if (!nextLane) continue;
      if (nextLane === "ready") {
        if (item.hour == null || item.minute == null) continue;
        writeLaneRef.current(
          item,
          {
            boardLane: "ready",
            hour: item.hour,
            minute: item.minute,
            second: item.second ?? 0,
            autoReady: true,
          },
          true,
        );
        continue;
      }
      writeLaneRef.current(
        item,
        { boardLane: "not", hour: null, minute: null, second: null },
        true,
      );
    }
  }, [draggingId, items, layoutNow, moveEpoch]);

  function placeCard(id: string, tone: BossTimeGroup) {
    const now = Date.now();
    const lane = BOSS_BOX_STATUS[tone];
    const current = items.find((item) => item.id === id);
    setDraggingId(null);
    setDropTone(null);
    if (!current || bossTimeGroup(current, now) === tone) return;
    retryAt.delete(id);
    const clock =
      tone === "over"
        ? { hour: null, minute: null, second: null }
        : clockForGroup(tone, now);
    writeLaneRef.current(current, { boardLane: lane, ...clock }, false);
  }

  const deleteMutation = useMutation({
    mutationFn: bossesService.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bosses"] });
      await queryClient.invalidateQueries({ queryKey: ["cities"] });
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
      await queryClient.invalidateQueries({ queryKey: ["type-servers"] });
      setDeleteTarget(null);
      toast.success("ลบบอสแล้ว");
    },
    onError: (err: Error) => {
      toast.error("ลบบอสไม่สำเร็จ", err.message);
    },
  });

  async function handleRefresh() {
    const result = await listQuery.refetch();
    if (result.isError) {
      toast.error("รีเฟรชไม่สำเร็จ", (result.error as Error).message);
      return;
    }
    toast.success("รีเฟรชข้อมูลแล้ว");
  }

  if (listQuery.isLoading && !listQuery.data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-muted)]">
        <Spinner />
        กำลังโหลดบอส...
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--surface)] p-6 text-sm text-[var(--danger)]">
        โหลดข้อมูลไม่สำเร็จ: {(listQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="flex items-center gap-2">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหาเมืองหรือเซิร์ฟเวอร์"
            className="h-11 min-w-0 flex-1"
            aria-label="ค้นหาบอส"
          />
          <Button
            type="button"
            variant="secondary"
            className="h-11 shrink-0 px-3"
            onClick={() => void handleRefresh()}
            disabled={listQuery.isFetching}
          >
            {listQuery.isFetching ? <Spinner /> : null}
            รีเฟรช
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <SearchableSelect
            value={cityId}
            onChange={(value) => setCityId(value)}
            options={cityOptions}
            placeholder="ทุกเมือง"
            searchPlaceholder="กรองเมือง..."
            emptyMessage="ไม่พบเมือง"
          />
          <SearchableSelect
            value={serverId}
            onChange={(value) => setServerId(value)}
            options={serverOptions}
            placeholder="ทุกเซิร์ฟเวอร์"
            searchPlaceholder="กรองเซิร์ฟเวอร์..."
            emptyMessage="ไม่พบเซิร์ฟเวอร์"
          />
          <SearchableSelect
            value={typeServerId}
            onChange={(value) => setTypeServerId(value)}
            options={typeOptions}
            placeholder="ทุกประเภท"
            searchPlaceholder="กรองประเภท..."
            emptyMessage="ไม่พบประเภท"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="ไม่มีบอส"
          description="เพิ่มเมือง เซิร์ฟเวอร์ และประเภทก่อน แล้วกดเพิ่มบอส"
        />
      ) : (
        <div className="overflow-x-auto overscroll-x-contain">
          <div className="grid min-w-[960px] grid-cols-3 gap-4 p-4">
            {(
              [
                ["over", bossWindowCopy.overTitle, overdue] as const,
                ["fresh", bossWindowCopy.freshTitle, recent] as const,
                ["upcoming", bossWindowCopy.upcomingTitle, upcoming] as const,
              ] as const
            ).map(([lane, title, laneItems]) => (
              <BossTimeTable
                key={lane}
                title={title}
                count={laneItems.length}
                tone={lane}
                items={laneItems}
                draggingId={draggingId}
                hot={dropTone === lane}
                onEdit={onEdit}
                onDelete={setDeleteTarget}
                onDragCard={setDraggingId}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropTone(null);
                }}
                onHoverLane={setDropTone}
                onDropCard={(id, target) => placeCard(id, target)}
                deletePending={deleteMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="ยืนยันการลบบอส"
        description={
          deleteTarget
            ? `ต้องการลบบอสเมือง “${deleteTarget.cityName}” บนเซิร์ฟเวอร์ “${deleteTarget.serverName}” หรือไม่?`
            : ""
        }
        pending={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

const BOARD_LANES = ["over", "fresh", "upcoming"] as const;

function laneFromPoint(x: number, y: number): BossTimeGroup | null {
  for (const node of document.elementsFromPoint(x, y)) {
    if (!(node instanceof Element)) continue;
    const lane = node.closest("[data-boss-lane]")?.getAttribute("data-boss-lane");
    const found = BOARD_LANES.find((item) => item === lane);
    if (found) return found;
  }
  return null;
}

function BossTimeTable({
  title,
  count,
  tone,
  items,
  draggingId,
  hot,
  onEdit,
  onDelete,
  onDragCard,
  onDragEnd,
  onHoverLane,
  onDropCard,
  deletePending,
}: {
  title: string;
  count: number;
  tone: BossTimeGroup;
  items: Boss[];
  draggingId: string | null;
  hot: boolean;
  onEdit: (item: Boss) => void;
  onDelete: (item: Boss) => void;
  onDragCard: (id: string) => void;
  onDragEnd: () => void;
  onHoverLane: (lane: BossTimeGroup | null) => void;
  onDropCard: (id: string, lane: BossTimeGroup) => void;
  deletePending: boolean;
}) {
  const over = tone === "over";
  const upcomingTone = tone === "upcoming";
  const sectionClass = over
    ? "overflow-hidden rounded-xl border border-[var(--warning)]/35 bg-[var(--surface-raised)]"
    : upcomingTone
      ? "overflow-hidden rounded-xl border border-[var(--accent)]/40 bg-[var(--surface-raised)]"
      : "overflow-hidden rounded-xl border border-[#7eb6d9]/40 bg-[var(--surface-raised)]";
  const headerClass = over
    ? "border-b border-[var(--warning)]/25 bg-[color-mix(in_oklab,var(--warning)_12%,transparent)] px-4 py-3"
    : upcomingTone
      ? "border-b border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-3"
      : "border-b border-[#7eb6d9]/25 bg-[color-mix(in_oklab,#7eb6d9_14%,transparent)] px-4 py-3";
  const elapsedClass = over
    ? "text-xs tabular-nums text-[var(--warning)]"
    : upcomingTone
      ? "text-xs tabular-nums text-[var(--accent-strong)]"
      : "text-xs tabular-nums text-[#9ec9e0]";
  return (
    <section
      data-boss-lane={tone}
      className={`${sectionClass} ${hot ? "ring-2 ring-[var(--accent)]" : ""}`}
      onDragOver={(event) => {
        if (!draggingId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onHoverLane(tone);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData("text/plain") || draggingId;
        if (id) onDropCard(id, tone);
      }}
    >
      <header className={`relative ${headerClass}`}>
        <h3 className="text-center font-[family-name:var(--font-display)] text-base font-semibold">
          {title}
        </h3>
        <span className="absolute top-3 right-4 rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--ink)]">
          {count}
        </span>
      </header>
      <div className="flex max-h-[34rem] min-h-36 flex-col gap-2 overflow-auto p-3">
        {items.length === 0 ? (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--ink-muted)]">
            {draggingId ? "วางการ์ดที่นี่" : "ไม่มีบอสในกลุ่มนี้"}
          </p>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              draggable
              onDragStart={(event) => {
                if ((event.target as HTMLElement).closest("button")) {
                  event.preventDefault();
                  return;
                }
                event.dataTransfer.setData("text/plain", item.id);
                event.dataTransfer.effectAllowed = "move";
                onDragCard(item.id);
              }}
              onDragEnd={onDragEnd}
              onPointerDown={(event) => {
                if (event.pointerType === "mouse") return;
                if ((event.target as HTMLElement).closest("button")) return;
                const pointerId = event.pointerId;
                const cardId = item.id;
                const startX = event.clientX;
                const startY = event.clientY;
                let active = false;

                const finish = () => {
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                  window.removeEventListener("pointercancel", onUp);
                  document.body.style.removeProperty("user-select");
                  document.body.style.removeProperty("touch-action");
                  onDragEnd();
                };

                const onMove = (moveEvent: PointerEvent) => {
                  if (moveEvent.pointerId !== pointerId) return;
                  const dx = moveEvent.clientX - startX;
                  const dy = moveEvent.clientY - startY;
                  if (!active) {
                    if (dx * dx + dy * dy < 64) return;
                    active = true;
                    document.body.style.userSelect = "none";
                    document.body.style.touchAction = "none";
                    onDragCard(cardId);
                  }
                  moveEvent.preventDefault();
                  onHoverLane(laneFromPoint(moveEvent.clientX, moveEvent.clientY));
                };

                const onUp = (upEvent: PointerEvent) => {
                  if (upEvent.pointerId !== pointerId) return;
                  const lane = active
                    ? laneFromPoint(upEvent.clientX, upEvent.clientY)
                    : null;
                  finish();
                  if (lane) onDropCard(cardId, lane);
                };

                window.addEventListener("pointermove", onMove, { passive: false });
                window.addEventListener("pointerup", onUp);
                window.addEventListener("pointercancel", onUp);
              }}
              className={`cursor-grab rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 active:cursor-grabbing ${
                draggingId === item.id
                  ? "touch-none opacity-40"
                  : "hover:bg-[var(--surface-hover)]"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-[family-name:var(--font-display)] text-lg font-semibold leading-tight tracking-tight text-[var(--ink)]">
                  {item.cityName}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]">
                    {item.serverName}
                  </p>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide ${
                      item.type === "premium"
                        ? "bg-[color-mix(in_oklab,var(--warning)_24%,var(--surface-raised))] text-[#f3d7a4]"
                        : "bg-[var(--surface-raised)] font-bold text-[var(--ink)]"
                    }`}
                  >
                    {TYPE_SERVER_LABEL[item.type]}
                  </span>
                </div>
              </div>
              {item.boardLane === "not" || item.hour == null || item.minute == null ? null : (
                <div className="mt-2">
                  <p className="font-medium tabular-nums text-[var(--ink)]">
                    {formatBossTime(item.hour, item.minute, item.second ?? 0)}
                  </p>
                  <BossElapsed
                    hour={item.hour}
                    minute={item.minute}
                    second={item.second ?? 0}
                    boardLane={item.boardLane}
                    className={elapsedClass}
                  />
                </div>
              )}
              <div className="mt-3 flex items-center justify-end gap-2">
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => onEdit(item)}
                  >
                    แก้ไข
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="h-8 px-2.5 text-xs"
                    disabled={deletePending}
                    onClick={() => onDelete(item)}
                  >
                    ลบ
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
