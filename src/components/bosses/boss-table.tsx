"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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
  bossTimeGroup,
  clockForGroup,
  bossWindowCopy,
  type BossTimeGroup,
  bossLaneClock,
  formatBossTime,
  readBoardLane,
} from "@/lib/bosses";
import { subscribeBossClock } from "@/components/bosses/use-boss-clock";
import { useLiveTopic } from "@/components/live/use-live-topic";
import type { LivePayload } from "@/lib/live";
import { BossApiError, bossesService } from "@/services/bosses.service";
import { citiesService } from "@/services/cities.service";
import { serversService } from "@/services/servers.service";
import { typeServersService } from "@/services/type-servers.service";
import type { Boss, BossBoardLane } from "@/types/boss";
import {
  isTypeServerKind,
  TYPE_SERVER_LABEL,
} from "@/types/type-server";

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
  expectedUpdatedAt?: string;
};

type PendingMove = LaneWrite & { at: number; seq: number };

const MISSING_STORAGE_KEY = "g2:bosses:missing";
const pendingMoves = new Map<string, PendingMove>();
/** Monotonic per-id token so a slow older PATCH cannot overwrite a newer drop. */
const moveSeq = new Map<string, number>();
/** Serializes network writes per boss — only the latest pending snapshot is sent. */
const laneChains = new Map<string, Promise<void>>();
/** Last server `updatedAt` per boss — never the optimistic client timestamp. */
const serverUpdatedAt = new Map<string, string>();
const baselineBoss = new Map<string, Boss>();
const missingBosses = new Set<string>(loadMissingBossIds());

function liveBossToBoss(row: NonNullable<LivePayload["boss"]>): Boss | null {
  if (!isTypeServerKind(row.type)) return null;
  return {
    id: row.id,
    cityId: row.cityId,
    cityName: row.cityName,
    serverId: row.serverId,
    serverName: row.serverName,
    typeServerId: row.typeServerId,
    type: row.type,
    hour: row.hour,
    minute: row.minute,
    second: row.second,
    boardLane: readBoardLane(row.boardLane),
    createBy: row.createBy,
    updateBy: row.updateBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function loadMissingBossIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(MISSING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function persistMissingBosses() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      MISSING_STORAGE_KEY,
      JSON.stringify([...missingBosses]),
    );
  } catch {
    /* private mode / quota */
  }
}

function markMissingBoss(id: string) {
  missingBosses.add(id);
  persistMissingBosses();
}

function clearMissingBoss(id: string) {
  if (!missingBosses.delete(id)) return;
  persistMissingBosses();
}

function isMissingBossError(error: unknown): boolean {
  return (
    (error instanceof BossApiError && error.status === 404) ||
    (error instanceof Error && error.message === "ไม่พบบอส")
  );
}

function isConflictError(error: unknown): boolean {
  return error instanceof BossApiError && error.status === 409;
}

async function saveLane(id: string, write: LaneWrite): Promise<Boss> {
  const clearingClock =
    write.hour == null && write.minute == null && write.second == null;
  const payload = {
    boardLane: write.boardLane,
    hour: write.hour,
    minute: write.minute,
    second: write.second,
    expectedUpdatedAt: write.expectedUpdatedAt,
  };
  try {
    return await bossesService.update(id, payload);
  } catch (error) {
    if (isMissingBossError(error) || !clearingClock || write.boardLane == null) {
      throw error;
    }
    try {
      return await bossesService.update(id, {
        boardLane: write.boardLane,
        expectedUpdatedAt: write.expectedUpdatedAt,
      });
    } catch (retryError) {
      throw isMissingBossError(retryError) ? retryError : error;
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

/**
 * Server list is authoritative for membership.
 * Pending local drops keep their lane/clock until that id's PATCH settles.
 */
function shareBossBoard(oldData: unknown, newData: unknown): Boss[] {
  if (!Array.isArray(newData)) return [];
  const incoming = (newData as Boss[]).filter((row) => !missingBosses.has(row.id));
  if (!Array.isArray(oldData)) return incoming;
  const previous = new Map((oldData as Boss[]).map((row) => [row.id, row]));
  return incoming.map((row) => {
    const pending = pendingMoves.get(row.id);
    const prior = previous.get(row.id);
    if (pending && prior) {
      return {
        ...row,
        boardLane: pending.boardLane,
        hour: pending.hour,
        minute: pending.minute,
        second: pending.second,
        updatedAt: prior.updatedAt > row.updatedAt ? prior.updatedAt : row.updatedAt,
      };
    }
    return row;
  });
}

function withoutMissingBosses(rows: Boss[] | undefined): Boss[] | undefined {
  if (!rows) return rows;
  if (missingBosses.size === 0) return rows;
  const next = rows.filter((row) => !missingBosses.has(row.id));
  return next.length === rows.length ? rows : next;
}

function patchBoardRow(
  rows: Boss[] | undefined,
  id: string,
  patch: Partial<Boss>,
): Boss[] | undefined {
  if (!rows) return rows;
  let found = false;
  const next = rows.map((row) => {
    if (row.id !== id) return row;
    found = true;
    return { ...row, ...patch };
  });
  return found ? next : rows;
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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cityId, setCityId] = useState("");
  const [serverId, setServerId] = useState("");
  const [typeServerId, setTypeServerId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Boss | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTone, setDropTone] = useState<BossTimeGroup | null>(null);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const dragGhostRef = useRef<HTMLDivElement>(null);
  const draggingIdRef = useRef<string | null>(null);
  draggingIdRef.current = draggingId;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const applyLiveBossPayload = (payload: LivePayload): boolean => {
    if (payload.topic !== "bosses") return false;
    if (payload.removedId) {
      markMissingBoss(payload.removedId);
      pendingMoves.delete(payload.removedId);
      baselineBoss.delete(payload.removedId);
      serverUpdatedAt.delete(payload.removedId);
      queryClient.setQueriesData<Boss[]>(
        { queryKey: ["bosses", "board"] },
        (rows) => rows?.filter((row) => row.id !== payload.removedId),
      );
      return true;
    }
    if (!payload.boss) return false;
    const boss = liveBossToBoss(payload.boss);
    if (!boss) return false;
    if (pendingMoves.has(boss.id)) return true;
    clearMissingBoss(boss.id);
    serverUpdatedAt.set(boss.id, boss.updatedAt);
    baselineBoss.set(boss.id, boss);
    queryClient.setQueriesData<Boss[]>(
      { queryKey: ["bosses", "board"] },
      (rows) => {
        if (!rows) return rows;
        if (!rows.some((row) => row.id === boss.id)) {
          return withoutMissingBosses([...rows, boss]);
        }
        return rows.map((row) => {
          if (row.id !== boss.id) return row;
          if (row.updatedAt > boss.updatedAt) return row;
          return boss;
        });
      },
    );
    return true;
  };

  useLiveTopic("bosses", {
    pause: () => Boolean(draggingIdRef.current),
    debounceMs: 400,
    onPayload: applyLiveBossPayload,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const [layoutNow, setLayoutNow] = useState(() => Date.now());

  const listQuery = useQuery({
    queryKey: ["bosses", "board", search, cityId, serverId, typeServerId],
    queryFn: async () => {
      const rows = await bossesService.listAll({
        q: search,
        cityId: cityId || undefined,
        serverId: serverId || undefined,
        typeServerId: typeServerId || undefined,
      });
      const alive = new Set(rows.map((row) => row.id));
      // Drop client-only ghosts that the API no longer returns.
      for (const id of [...missingBosses]) {
        if (alive.has(id)) clearMissingBoss(id);
      }
      for (const id of [...pendingMoves.keys()]) {
        if (!alive.has(id)) {
          pendingMoves.delete(id);
          markMissingBoss(id);
        }
      }
      for (const row of rows) {
        serverUpdatedAt.set(row.id, row.updatedAt);
        baselineBoss.set(row.id, row);
      }
      return rows.filter((row) => !missingBosses.has(row.id));
    },
    placeholderData: (previous) => withoutMissingBosses(previous),
    structuralSharing: shareBossBoard,
    staleTime: 5_000,
  });

  const citiesQuery = useQuery({
    queryKey: ["cities", "filters"],
    queryFn: () => citiesService.list({ page: 1, limit: 200 }),
    staleTime: 60_000,
  });
  const serversQuery = useQuery({
    queryKey: ["servers", "filters"],
    queryFn: () => serversService.list({ page: 1, limit: 200 }),
    staleTime: 60_000,
  });
  const typesQuery = useQuery({
    queryKey: ["type-servers", "filters"],
    queryFn: () => typeServersService.list({ page: 1, limit: 200 }),
    staleTime: 60_000,
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

  const items = useMemo(
    () => withoutMissingBosses(listQuery.data) ?? EMPTY_ARRAY,
    [listQuery.data],
  );
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const boardKey = ["bosses", "board", search, cityId, serverId, typeServerId] as const;
  const boardKeyRef = useRef(boardKey);
  boardKeyRef.current = boardKey;

  useEffect(() => {
    return subscribeBossClock((next) => {
      if (draggingIdRef.current) return;
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

  const writeLaneRef = useRef<(item: Boss, write: LaneWrite) => void>(() => {});

  useEffect(() => {
    writeLaneRef.current = (item, write) => {
      if (missingBosses.has(item.id)) return;
      const key = boardKeyRef.current;
      const cached = queryClient
        .getQueryData<Boss[]>(key)
        ?.find((row) => row.id === item.id);
      if (!cached) return;

      const current = pendingMoves.get(item.id);
      if (current && sameLaneWrite(current, write) && Date.now() - current.at < 8000) {
        return;
      }

      if (!baselineBoss.has(item.id)) baselineBoss.set(item.id, cached);
      if (!serverUpdatedAt.has(item.id)) {
        serverUpdatedAt.set(item.id, cached.updatedAt);
      }

      const seq = (moveSeq.get(item.id) ?? 0) + 1;
      moveSeq.set(item.id, seq);
      pendingMoves.set(item.id, {
        ...write,
        expectedUpdatedAt: serverUpdatedAt.get(item.id) ?? cached.updatedAt,
        at: Date.now(),
        seq,
      });

      queryClient.setQueryData<Boss[]>(key, (rows) =>
        patchBoardRow(rows, item.id, {
          boardLane: write.boardLane,
          hour: write.hour,
          minute: write.minute,
          second: write.second,
        }),
      );

      const prev = laneChains.get(item.id) ?? Promise.resolve();
      const chain = prev
        .catch(() => undefined)
        .then(async () => {
          // Latest-wins: after earlier writes finish, send only the newest snapshot.
          let conflictRetries = 0;
          while (true) {
            const snap = pendingMoves.get(item.id);
            if (!snap) return;
            const runSeq = snap.seq;
            if (runSeq !== (moveSeq.get(item.id) ?? 0)) return;

            try {
              if (missingBosses.has(item.id)) {
                throw new BossApiError("ไม่พบบอส", 404);
              }
              const boss = await saveLane(item.id, {
                boardLane: snap.boardLane,
                hour: snap.hour,
                minute: snap.minute,
                second: snap.second,
                expectedUpdatedAt:
                  serverUpdatedAt.get(item.id) ?? snap.expectedUpdatedAt,
              });
              if ((moveSeq.get(item.id) ?? 0) !== runSeq) {
                serverUpdatedAt.set(boss.id, boss.updatedAt);
                baselineBoss.set(boss.id, boss);
                continue;
              }
              pendingMoves.delete(item.id);
              clearMissingBoss(boss.id);
              serverUpdatedAt.set(boss.id, boss.updatedAt);
              baselineBoss.set(boss.id, boss);
              queryClient.setQueryData<Boss[]>(boardKeyRef.current, (rows) => {
                if (!rows) return rows;
                if (!rows.some((row) => row.id === boss.id)) {
                  return withoutMissingBosses([...rows, boss]);
                }
                return withoutMissingBosses(
                  rows.map((row) => (row.id === boss.id ? boss : row)),
                );
              });
              return;
            } catch (error) {
              if ((moveSeq.get(item.id) ?? 0) !== runSeq) continue;

              if (isMissingBossError(error)) {
                pendingMoves.delete(item.id);
                markMissingBoss(item.id);
                baselineBoss.delete(item.id);
                serverUpdatedAt.delete(item.id);
                queryClient.setQueryData<Boss[]>(boardKeyRef.current, (rows) =>
                  rows?.filter((row) => row.id !== item.id),
                );
                return;
              }

              if (
                isConflictError(error) &&
                error instanceof BossApiError &&
                error.boss
              ) {
                clearMissingBoss(error.boss.id);
                serverUpdatedAt.set(error.boss.id, error.boss.updatedAt);
                baselineBoss.set(error.boss.id, error.boss);
                // Keep the user's intended lane; retry once with the fresh revision.
                pendingMoves.set(item.id, {
                  ...snap,
                  expectedUpdatedAt: error.boss.updatedAt,
                  at: Date.now(),
                  seq: runSeq,
                });
                queryClient.setQueryData<Boss[]>(boardKeyRef.current, (rows) =>
                  patchBoardRow(withoutMissingBosses(rows), item.id, {
                    ...error.boss!,
                    boardLane: snap.boardLane,
                    hour: snap.hour,
                    minute: snap.minute,
                    second: snap.second,
                  }),
                );
                if (conflictRetries < 1) {
                  conflictRetries += 1;
                  continue;
                }
                pendingMoves.delete(item.id);
                queryClient.setQueryData<Boss[]>(boardKeyRef.current, (rows) =>
                  patchBoardRow(
                    withoutMissingBosses(rows),
                    error.boss!.id,
                    error.boss!,
                  ),
                );
                toastRef.current.error("ย้ายการ์ดไม่สำเร็จ", error.message);
                return;
              }

              pendingMoves.delete(item.id);
              const baseline = baselineBoss.get(item.id);
              if (baseline) {
                queryClient.setQueryData<Boss[]>(boardKeyRef.current, (rows) =>
                  patchBoardRow(rows, item.id, baseline),
                );
              }
              const message =
                error instanceof Error ? error.message : "ย้ายการ์ดไม่สำเร็จ";
              toastRef.current.error("ย้ายการ์ดไม่สำเร็จ", message);
              return;
            }
          }
        })
        .finally(() => {
          if (laneChains.get(item.id) === chain) laneChains.delete(item.id);
        });
      laneChains.set(item.id, chain);
    };
  }, [queryClient]);

  function placeCard(id: string, tone: BossTimeGroup) {
    const now = Date.now();
    const lane = BOSS_BOX_STATUS[tone];
    const current =
      queryClient.getQueryData<Boss[]>(boardKey)?.find((row) => row.id === id) ??
      items.find((item) => item.id === id);
    setDraggingId(null);
    setDropTone(null);
    if (!current || missingBosses.has(id)) return;
    if (bossTimeGroup(current, now) === tone) return;
    const clock =
      tone === "over"
        ? { hour: null, minute: null, second: null }
        : clockForGroup(tone, now);
    writeLaneRef.current(current, {
      boardLane: lane,
      ...clock,
      expectedUpdatedAt: current.updatedAt,
    });
  }

  const deleteMutation = useMutation({
    mutationFn: bossesService.remove,
    onMutate: async (id) => {
      markMissingBoss(id);
      await queryClient.cancelQueries({ queryKey: ["bosses"] });
      const previous = queryClient.getQueryData<Boss[]>(boardKey);
      queryClient.setQueryData<Boss[]>(boardKey, (rows) =>
        rows?.filter((row) => row.id !== id),
      );
      return { previous };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bosses"] });
      await queryClient.invalidateQueries({ queryKey: ["cities"] });
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
      await queryClient.invalidateQueries({ queryKey: ["type-servers"] });
      setDeleteTarget(null);
      toast.success("ลบบอสแล้ว");
    },
    onError: (err: Error, id, context) => {
      clearMissingBoss(id);
      if (context?.previous) {
        queryClient.setQueryData(boardKey, context.previous);
      }
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
        <div
          data-boss-board-scroll
          className={`overflow-x-auto overscroll-x-contain ${
            draggingId ? "touch-none" : ""
          }`}
        >
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
                onDragGhost={(ghost) => {
                  if (!ghost) {
                    setDragGhost(null);
                    return;
                  }
                  const transform = `translate3d(${ghost.x - ghost.grabX}px, ${ghost.y - ghost.grabY}px, 0)`;
                  const node = dragGhostRef.current;
                  if (node) node.style.transform = transform;
                  setDragGhost((prev) =>
                    prev?.item.id === ghost.item.id ? prev : ghost,
                  );
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropTone(null);
                  setDragGhost(null);
                }}
                onHoverLane={(lane) => {
                  setDropTone((prev) => (prev === lane ? prev : lane));
                }}
                onDropCard={(id, target) => placeCard(id, target)}
                deletePending={deleteMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {dragGhost ? (
        <div
          ref={dragGhostRef}
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 z-[300] will-change-transform"
          style={{
            width: dragGhost.width,
            transform: `translate3d(${dragGhost.x - dragGhost.grabX}px, ${dragGhost.y - dragGhost.grabY}px, 0)`,
            opacity: 0.96,
          }}
        >
          <BossDragGhost item={dragGhost.item} />
        </div>
      ) : null}

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
const TOUCH_DRAG_THRESHOLD_PX = 8;
const DRAG_SCROLL_EDGE_PX = 56;
const DRAG_SCROLL_MAX_PX = 24;

type DragGhost = {
  item: Boss;
  x: number;
  y: number;
  width: number;
  grabX: number;
  grabY: number;
};

function BossDragGhost({ item }: { item: Boss }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
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
      {item.hour != null && item.minute != null ? (
        <p className="mt-2 font-medium tabular-nums text-[var(--ink)]">
          {formatBossTime(item.hour, item.minute, item.second ?? 0)}
        </p>
      ) : null}
    </div>
  );
}

function laneFromPoint(x: number, y: number): BossTimeGroup | null {
  for (const node of document.elementsFromPoint(x, y)) {
    if (!(node instanceof Element)) continue;
    const lane = node.closest("[data-boss-lane]")?.getAttribute("data-boss-lane");
    const found = BOARD_LANES.find((item) => item === lane);
    if (found) return found;
  }
  return null;
}

function scrollSpeed(distanceFromEdge: number, edge: number, max: number): number {
  if (distanceFromEdge >= edge) return 0;
  const t = 1 - Math.max(0, distanceFromEdge) / edge;
  return Math.ceil(max * t * t);
}

/** Scroll board / column / page while a card is held near an edge. */
function autoScrollDragContainers(clientX: number, clientY: number) {
  const edge = DRAG_SCROLL_EDGE_PX;
  const max = DRAG_SCROLL_MAX_PX;

  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const left = scrollSpeed(clientX, edge, max);
  const right = scrollSpeed(viewW - clientX, edge, max);
  const top = scrollSpeed(clientY, edge, max);
  const bottom = scrollSpeed(viewH - clientY, edge, max);
  if (left || right || top || bottom) {
    window.scrollBy(right - left, bottom - top);
  }

  const board = document.querySelector("[data-boss-board-scroll]");
  if (board instanceof HTMLElement) {
    const rect = board.getBoundingClientRect();
    const boardLeft = scrollSpeed(clientX - rect.left, edge, max);
    const boardRight = scrollSpeed(rect.right - clientX, edge, max);
    if (boardLeft || boardRight) board.scrollLeft += boardRight - boardLeft;
  }

  for (const node of document.elementsFromPoint(clientX, clientY)) {
    if (!(node instanceof Element)) continue;
    const laneScroll = node.closest("[data-boss-lane-scroll]");
    if (!(laneScroll instanceof HTMLElement)) continue;
    const rect = laneScroll.getBoundingClientRect();
    const laneTop = scrollSpeed(clientY - rect.top, edge, max);
    const laneBottom = scrollSpeed(rect.bottom - clientY, edge, max);
    if (laneTop || laneBottom) laneScroll.scrollTop += laneBottom - laneTop;
    break;
  }
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
  onDragGhost,
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
  onDragGhost: (ghost: DragGhost | null) => void;
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
      className={`${sectionClass} ${
        hot ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface-raised))]" : ""
      }`}
    >
      <header className={`relative ${headerClass}`}>
        <h3 className="text-center font-[family-name:var(--font-display)] text-base font-semibold">
          {title}
        </h3>
        <span className="absolute top-3 right-4 rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--ink)]">
          {count}
        </span>
      </header>
      <div
        data-boss-lane-scroll
        className={`flex max-h-[34rem] min-h-36 flex-col gap-2 overflow-auto p-3 ${
          draggingId ? "touch-none" : ""
        }`}
      >
        {items.length === 0 ? (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--ink-muted)]">
            {draggingId ? "วางการ์ดที่นี่" : "ไม่มีบอสในกลุ่มนี้"}
          </p>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              draggable={false}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                if ((event.target as HTMLElement).closest("button")) return;

                const card = event.currentTarget;
                const pointerId = event.pointerId;
                const cardId = item.id;
                const startX = event.clientX;
                const startY = event.clientY;
                const rect = card.getBoundingClientRect();
                const grabX = startX - rect.left;
                const grabY = startY - rect.top;
                const ghostWidth = rect.width;
                let active = false;
                let lastX = startX;
                let lastY = startY;
                let raf = 0;
                const threshold =
                  TOUCH_DRAG_THRESHOLD_PX * TOUCH_DRAG_THRESHOLD_PX;

                try {
                  card.setPointerCapture(pointerId);
                } catch {
                  /* older WebViews */
                }

                const publishGhost = (x: number, y: number) => {
                  onDragGhost({
                    item,
                    x,
                    y,
                    width: ghostWidth,
                    grabX,
                    grabY,
                  });
                };

                const stopAutoScroll = () => {
                  if (raf) {
                    cancelAnimationFrame(raf);
                    raf = 0;
                  }
                };

                const tickDragFrame = () => {
                  if (!active) {
                    raf = 0;
                    return;
                  }
                  autoScrollDragContainers(lastX, lastY);
                  onHoverLane(laneFromPoint(lastX, lastY));
                  publishGhost(lastX, lastY);
                  raf = requestAnimationFrame(tickDragFrame);
                };

                const finish = () => {
                  stopAutoScroll();
                  card.removeEventListener("pointermove", onMove);
                  card.removeEventListener("pointerup", onUp);
                  card.removeEventListener("pointercancel", onUp);
                  try {
                    if (card.hasPointerCapture(pointerId)) {
                      card.releasePointerCapture(pointerId);
                    }
                  } catch {
                    /* ignore */
                  }
                  document.body.style.removeProperty("user-select");
                  document.body.style.removeProperty("touch-action");
                  document.body.style.removeProperty("-webkit-user-select");
                  document.body.style.removeProperty("cursor");
                  onDragGhost(null);
                  onDragEnd();
                };

                const onMove = (moveEvent: PointerEvent) => {
                  if (moveEvent.pointerId !== pointerId) return;
                  lastX = moveEvent.clientX;
                  lastY = moveEvent.clientY;
                  const dx = lastX - startX;
                  const dy = lastY - startY;
                  if (!active) {
                    if (dx * dx + dy * dy < threshold) return;
                    active = true;
                    document.body.style.userSelect = "none";
                    document.body.style.setProperty(
                      "-webkit-user-select",
                      "none",
                    );
                    document.body.style.touchAction = "none";
                    document.body.style.cursor = "grabbing";
                    onDragCard(cardId);
                    if (!raf) raf = requestAnimationFrame(tickDragFrame);
                  }
                  moveEvent.preventDefault();
                };

                const onUp = (upEvent: PointerEvent) => {
                  if (upEvent.pointerId !== pointerId) return;
                  const lane = active
                    ? laneFromPoint(upEvent.clientX, upEvent.clientY)
                    : null;
                  finish();
                  if (lane) onDropCard(cardId, lane);
                };

                card.addEventListener("pointermove", onMove, {
                  passive: false,
                });
                card.addEventListener("pointerup", onUp);
                card.addEventListener("pointercancel", onUp);
              }}
              className={`cursor-grab select-none rounded-xl border bg-[var(--surface)] p-3 active:cursor-grabbing ${
                draggingId === item.id
                  ? "touch-none border-[var(--line)] opacity-30"
                  : "touch-pan-y border-[var(--line)] hover:bg-[var(--surface-hover)]"
              }`}
              style={
                {
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
                } satisfies CSSProperties
              }
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
