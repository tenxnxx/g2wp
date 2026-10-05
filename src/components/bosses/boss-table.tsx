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
import {
  BOSS_BOX_STATUS,
  bossElapsedMs,
  bossShouldReturnToWait,
  bossTimeGroup,
  clockForGroup,
  bossWindowCopy,
  type BossTimeGroup,
  formatBossElapsed,
  formatBossTime,
} from "@/lib/bosses";
import { subscribeBossClock } from "@/components/bosses/use-boss-clock";
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

function BossElapsed({
  hour,
  minute,
  second,
  className,
}: {
  hour: number;
  minute: number;
  second: number;
  className: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const paint = (at: number) => {
      const node = ref.current;
      if (!node) return;
      node.textContent = formatBossElapsed(
        bossElapsedMs({ hour, minute, second }, at),
      );
    };
    paint(Date.now());
    return subscribeBossClock((at) => paint(at));
  }, [hour, minute, second]);

  return (
    <p ref={ref} className={className} suppressHydrationWarning>
      {formatBossElapsed(bossElapsedMs({ hour, minute, second }))}
    </p>
  );
}

export function BossTable({ onEdit }: BossTableProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
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
  const [clockConnected, setClockConnected] = useState(false);

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
  const serverOptions = useMemo(
    () => [
      { value: "", label: "ทุกเซิร์ฟเวอร์" },
      ...(serversQuery.data?.data ?? EMPTY_ARRAY).map((row) => ({
        value: row.id,
        label: row.serverName,
      })),
    ],
    [serversQuery.data?.data],
  );
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

  useEffect(() => {
    return subscribeBossClock((next, isConnected) => {
      setClockConnected((prev) => (prev === isConnected ? prev : isConnected));
      setLayoutNow((prev) =>
        boardGroupKey(items, prev) === boardGroupKey(items, next) ? prev : next,
      );
    });
  }, [items]);

  const ordered = [...items].sort(
    (a, b) => bossElapsedMs(b, layoutNow) - bossElapsedMs(a, layoutNow),
  );
  const overdue = ordered.filter((item) => bossTimeGroup(item, layoutNow) === "over");
  const recent = ordered.filter((item) => bossTimeGroup(item, layoutNow) === "fresh");
  const upcoming = ordered.filter((item) => bossTimeGroup(item, layoutNow) === "upcoming");

  const boardKey = ["bosses", "board", search, cityId, serverId, typeServerId] as const;
  const returningToWait = useRef(new Set<string>());
  const quietMove = useRef(new Set<string>());

  const laneMutation = useMutation({
    mutationFn: ({
      id,
      boardLane,
      hour,
      minute,
      second,
    }: {
      id: string;
      boardLane: BossBoardLane | null;
      hour?: number;
      minute?: number;
      second?: number;
    }) => bossesService.update(id, { boardLane, hour, minute, second }),
    onMutate: async ({ id, boardLane, hour, minute, second }) => {
      await queryClient.cancelQueries({ queryKey: ["bosses", "board"] });
      const previous = queryClient.getQueryData<Boss[]>(boardKey);
      queryClient.setQueryData<Boss[]>(boardKey, (rows) =>
        rows?.map((row) =>
          row.id === id
            ? {
                ...row,
                boardLane,
                ...(hour !== undefined ? { hour } : {}),
                ...(minute !== undefined ? { minute } : {}),
                ...(second !== undefined ? { second } : {}),
              }
            : row,
        ),
      );
      return { previous };
    },
    onError: (err: Error, vars, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey, context.previous);
      if (quietMove.current.has(vars.id)) {
        quietMove.current.delete(vars.id);
        return;
      }
      toast.error("ย้ายการ์ดไม่สำเร็จ", err.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bosses"] });
    },
  });

  useEffect(() => {
    for (const item of items) {
      if (draggingId === item.id || returningToWait.current.has(item.id)) continue;
      if (!bossShouldReturnToWait(item, layoutNow)) continue;
      returningToWait.current.add(item.id);
      quietMove.current.add(item.id);
      const clock = clockForGroup("fresh", layoutNow);
      laneMutation.mutate(
        { id: item.id, boardLane: null, ...clock },
        {
          onSettled: () => {
            returningToWait.current.delete(item.id);
          },
        },
      );
    }
  }, [draggingId, items, laneMutation, layoutNow]);

  function placeCard(id: string, tone: BossTimeGroup) {
    const now = Date.now();
    const lane = BOSS_BOX_STATUS[tone];
    const current = items.find((item) => item.id === id);
    setDraggingId(null);
    setDropTone(null);
    if (!current || bossTimeGroup(current, now) === tone) return;
    const clock = clockForGroup(tone, now);
    laneMutation.mutate({ id, boardLane: lane, ...clock });
  }

  function releaseCard(id: string) {
    const current = items.find((item) => item.id === id);
    if (!current?.boardLane) return;
    laneMutation.mutate({ id, boardLane: null });
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
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 border-b border-[var(--line)] px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              รายการบอส
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              เทียบเวลาปัจจุบันกับเวลาที่เลือกตอนบันทึก
              {clockConnected ? " · เวลาสด" : ""}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหา..."
              className="sm:w-64"
              aria-label="ค้นหาบอส"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleRefresh()}
              disabled={listQuery.isFetching}
            >
              {listQuery.isFetching ? <Spinner /> : null}
              รีเฟรช
            </Button>
          </div>
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
        <div className="grid gap-4 p-4 xl:grid-cols-3">
          <BossTimeTable
            title={bossWindowCopy.overTitle}
            hint={bossWindowCopy.overHint}
            count={overdue.length}
            status={BOSS_BOX_STATUS.over}
            tone="over"
            items={overdue}
            draggingId={draggingId}
            hot={dropTone === "over"}
            onEdit={onEdit}
            onDelete={setDeleteTarget}
            onRelease={releaseCard}
            onDragCard={setDraggingId}
            onDragEnd={() => {
              setDraggingId(null);
              setDropTone(null);
            }}
            onDragOverColumn={() => setDropTone("over")}
            onDropCard={(id) => placeCard(id, "over")}
            deletePending={deleteMutation.isPending}
          />
          <BossTimeTable
            title={bossWindowCopy.freshTitle}
            hint={bossWindowCopy.freshHint}
            count={recent.length}
            status={BOSS_BOX_STATUS.fresh}
            tone="fresh"
            items={recent}
            draggingId={draggingId}
            hot={dropTone === "fresh"}
            onEdit={onEdit}
            onDelete={setDeleteTarget}
            onRelease={releaseCard}
            onDragCard={setDraggingId}
            onDragEnd={() => {
              setDraggingId(null);
              setDropTone(null);
            }}
            onDragOverColumn={() => setDropTone("fresh")}
            onDropCard={(id) => placeCard(id, "fresh")}
            deletePending={deleteMutation.isPending}
          />
          <BossTimeTable
            title={bossWindowCopy.upcomingTitle}
            hint={bossWindowCopy.upcomingHint}
            count={upcoming.length}
            status={BOSS_BOX_STATUS.upcoming}
            tone="upcoming"
            items={upcoming}
            draggingId={draggingId}
            hot={dropTone === "upcoming"}
            onEdit={onEdit}
            onDelete={setDeleteTarget}
            onRelease={releaseCard}
            onDragCard={setDraggingId}
            onDragEnd={() => {
              setDraggingId(null);
              setDropTone(null);
            }}
            onDragOverColumn={() => setDropTone("upcoming")}
            onDropCard={(id) => placeCard(id, "upcoming")}
            deletePending={deleteMutation.isPending}
          />
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

function BossTimeTable({
  title,
  hint,
  count,
  status,
  tone,
  items,
  draggingId,
  hot,
  onEdit,
  onDelete,
  onRelease,
  onDragCard,
  onDragEnd,
  onDragOverColumn,
  onDropCard,
  deletePending,
}: {
  title: string;
  hint: string;
  count: number;
  status: BossBoardLane;
  tone: BossTimeGroup;
  items: Boss[];
  draggingId: string | null;
  hot: boolean;
  onEdit: (item: Boss) => void;
  onDelete: (item: Boss) => void;
  onRelease: (id: string) => void;
  onDragCard: (id: string) => void;
  onDragEnd: () => void;
  onDragOverColumn: () => void;
  onDropCard: (id: string) => void;
  deletePending: boolean;
}) {
  const over = tone === "over";
  const upcomingTone = tone === "upcoming";
  const sectionClass = over
    ? "overflow-hidden rounded-xl border border-[var(--warning)]/35 bg-[var(--surface-raised)]"
    : upcomingTone
      ? "overflow-hidden rounded-xl border border-[#7eb6d9]/40 bg-[var(--surface-raised)]"
      : "overflow-hidden rounded-xl border border-[var(--accent)]/40 bg-[var(--surface-raised)]";
  const headerClass = over
    ? "border-b border-[var(--warning)]/25 bg-[color-mix(in_oklab,var(--warning)_12%,transparent)] px-4 py-3"
    : upcomingTone
      ? "border-b border-[#7eb6d9]/25 bg-[color-mix(in_oklab,#7eb6d9_14%,transparent)] px-4 py-3"
      : "border-b border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-3";
  const elapsedClass = over
    ? "text-xs tabular-nums text-[var(--warning)]"
    : upcomingTone
      ? "text-xs tabular-nums text-[#9ec9e0]"
      : "text-xs tabular-nums text-[var(--accent-strong)]";

  return (
    <section
      className={`${sectionClass} ${hot ? "ring-2 ring-[var(--accent)]" : ""}`}
      onDragOver={(event) => {
        if (!draggingId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOverColumn();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData("text/plain") || draggingId;
        if (id) onDropCard(id);
      }}
    >
      <header className={headerClass}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold">
            {title}
          </h3>
          <span className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--ink)]">
            {count}
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">{hint}</p>
        <p className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-[var(--ink-muted)]">status</span>
          <span className="rounded-md bg-[var(--surface)] px-2 py-0.5 font-semibold uppercase tracking-wide text-[var(--ink)]">
            {status}
          </span>
        </p>
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
              className={`cursor-grab rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 active:cursor-grabbing ${
                draggingId === item.id ? "opacity-40" : "hover:bg-[var(--surface-hover)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--ink)]">{item.cityName}</p>
                  <p className="truncate text-xs text-[var(--ink-muted)]">
                    {item.serverName} · {TYPE_SERVER_LABEL[item.type]}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink)]">
                  {status}
                </span>
              </div>
              <div className="mt-2">
                <p className="font-medium tabular-nums text-[var(--ink)]">
                  {formatBossTime(item.hour, item.minute, item.second)}
                </p>
                <BossElapsed
                  hour={item.hour}
                  minute={item.minute}
                  second={item.second}
                  className={elapsedClass}
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                {item.boardLane ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--ink-muted)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
                    onClick={() => onRelease(item.id)}
                  >
                    ตามเวลา
                  </button>
                ) : (
                  <span className="text-xs text-[var(--ink-muted)]">ลากได้</span>
                )}
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
