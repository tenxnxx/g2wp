"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { teamsService } from "@/services/teams.service";
import {
  MAIN_SLOT_LIMIT,
  RESERVE_SLOT_LIMIT,
  type BoardPlayer,
  type TeamBoard,
  type TeamSlotType,
} from "@/types/team-board";

const TEAM_DRAG_TYPE = "application/x-g2-team";
/** Matches CACHE_TTL.board so a poll is not shorter than the server cache. */
const BOARD_REFRESH_MS = 15_000;

function isTeamDrag(event: DragEvent): boolean {
  return [...event.dataTransfer.types].some((type) => type.toLowerCase() === TEAM_DRAG_TYPE);
}

const STATUS_LABEL: Record<TeamBoard["session"]["status"], string> = {
  draft: "กำลังจัด",
  active: "กำลังใช้งาน",
  completed: "จบแล้ว",
};

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 2);
}

function EmptySlot({ onClick }: { onClick: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <button
      type="button"
      className={`flex h-12 w-full items-center justify-center rounded-xl border border-dashed text-xs ${
        over
          ? "border-[var(--accent-strong)] bg-[color-mix(in_oklab,var(--accent-strong)_22%,transparent)] text-[var(--accent-strong)]"
          : "border-[var(--line)] text-[var(--ink-muted)] hover:bg-[var(--surface-hover)]"
      }`}
      onClick={onClick}
      onDragOver={(event) => {
        if (isTeamDrag(event)) return;
        if (![...event.dataTransfer.types].includes("text/plain")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        setOver(false);
      }}
      onDrop={() => setOver(false)}
    >
      + เพิ่มผู้เล่น
    </button>
  );
}

function PlayerFace({ name }: { name: string }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface-hover)] text-[11px] font-semibold text-[var(--accent-strong)]">
      {initials(name)}
    </span>
  );
}

function PlayerChip({
  player,
  crowned = false,
  trailing,
  onSwap,
}: {
  player: BoardPlayer;
  crowned?: boolean;
  trailing?: ReactNode;
  onSwap: (sourceId: string, targetId: string) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", player.assignmentId);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(event) => {
        if (isTeamDrag(event)) return;
        if (![...event.dataTransfer.types].includes("text/plain")) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        setOver(false);
      }}
      onDrop={(event) => {
        if (isTeamDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setOver(false);
        const sourceId = event.dataTransfer.getData("text/plain");
        if (!sourceId || sourceId === player.assignmentId) return;
        onSwap(sourceId, player.assignmentId);
      }}
      className={`flex min-w-0 cursor-grab items-center gap-2 rounded-xl border px-2 py-1.5 active:cursor-grabbing ${
        over
          ? "border-[var(--accent-strong)] bg-[var(--surface-hover)]"
          : "border-[var(--line)] bg-[var(--surface)]"
      }`}
    >
      <PlayerFace name={player.name} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1 text-sm font-medium text-[var(--ink)]">
          <span className="truncate">{player.name}</span>
          {crowned ? (
            <span
              aria-label="หัวหน้าทีม"
              title="หัวหน้าทีม"
              className="shrink-0 text-base leading-none text-[#f5c451] drop-shadow-[0_0_6px_rgba(245,196,81,0.65)]"
            >
              ♔
            </span>
          ) : null}
        </span>
        <span className="block truncate text-[11px] text-[var(--ink-muted)]">
          {player.memberName}
        </span>
      </span>
      {trailing}
    </div>
  );
}

export function TeamsPageClient() {
  const toast = useToast();
  const [board, setBoard] = useState<TeamBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [addMainLimit, setAddMainLimit] = useState(String(MAIN_SLOT_LIMIT));
  const [addReserveLimit, setAddReserveLimit] = useState(String(RESERVE_SLOT_LIMIT));
  const [picker, setPicker] = useState<{
    teamId: string;
    teamName: string;
    slotType: "main" | "reserve";
  } | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [editTeam, setEditTeam] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [editMainLimit, setEditMainLimit] = useState("5");
  const [editReserveLimit, setEditReserveLimit] = useState("3");
  const [dragOverTeamId, setDragOverTeamId] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const draggingRef = useRef(false);

  async function run(task: () => Promise<TeamBoard>, success?: string) {
    pendingRef.current = true;
    setPending(true);
    try {
      const next = await task();
      setBoard(next);
      setError(null);
      if (success) toast.success(success);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "บันทึกไม่สำเร็จ";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  useEffect(() => {
    const onStart = () => {
      draggingRef.current = true;
    };
    const onEnd = () => {
      draggingRef.current = false;
    };
    window.addEventListener("dragstart", onStart);
    window.addEventListener("dragend", onEnd);
    return () => {
      window.removeEventListener("dragstart", onStart);
      window.removeEventListener("dragend", onEnd);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refresh(initial: boolean) {
      if (
        !initial &&
        (pendingRef.current ||
          draggingRef.current ||
          document.visibilityState !== "visible")
      ) {
        return;
      }
      try {
        const data = await teamsService.board();
        if (!cancelled) {
          setBoard(data);
          if (initial) setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled && initial) {
          setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
        }
      } finally {
        if (!cancelled && initial) setLoading(false);
      }
    }

    void refresh(true);
    const timer = window.setInterval(() => {
      void refresh(false);
    }, BOARD_REFRESH_MS);
    const onVisible = () => {
      void refresh(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  function reorderOnto(event: DragEvent, targetId: string) {
    event.preventDefault();
    event.stopPropagation();
    setDragOverTeamId(null);
    if (!board || pending) return;
    const sourceId = event.dataTransfer.getData(TEAM_DRAG_TYPE);
    if (!sourceId || sourceId === targetId) return;
    const ids = board.teams.map((team) => team.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    void run(() => teamsService.reorder(ids));
  }

  function onDrop(event: DragEvent, slotType: TeamSlotType, teamId?: string) {
    if (isTeamDrag(event)) {
      if (teamId) reorderOnto(event, teamId);
      return;
    }
    event.preventDefault();
    const assignmentId = event.dataTransfer.getData("text/plain");
    if (!assignmentId || pending) return;
    if (slotType === "main" || slotType === "reserve") {
      if (!teamId) return;
      void run(() => teamsService.move({ assignmentId, slotType, teamId }));
      return;
    }
    void run(() => teamsService.move({ assignmentId, slotType }));
  }

  function swapPlayers(sourceId: string, targetId: string) {
    if (pending) return;
    void run(() => teamsService.swap(sourceId, targetId), "สลับผู้เล่นแล้ว");
  }

  const needle = query.trim().toLocaleLowerCase();
  const waiting =
    board?.waiting.filter((player) => {
      if (!needle) return true;
      return (
        player.name.toLocaleLowerCase().includes(needle) ||
        player.memberName.toLocaleLowerCase().includes(needle)
      );
    }) ?? [];
  const pickerNeedle = pickerQuery.trim().toLocaleLowerCase();
  const pickerPlayers =
    board?.waiting.filter((player) => {
      if (!pickerNeedle) return true;
      return (
        player.name.toLocaleLowerCase().includes(pickerNeedle) ||
        player.memberName.toLocaleLowerCase().includes(pickerNeedle)
      );
    }) ?? [];

  const removeTarget = board?.teams.find((team) => team.id === removeId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            จัดทีม
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            {board?.session.title ?? "จัดผู้เล่นเข้าทีมหลัก สำรอง หรือพัก"}
            {board ? ` · ${STATUS_LABEL[board.session.status]}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {board?.session.status === "draft" ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => void run(() => teamsService.start(), "เริ่มรอบนี้แล้ว")}
            >
              เริ่มรอบนี้
            </Button>
          ) : null}
          {board?.session.status === "active" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => void run(() => teamsService.complete(), "จบรอบแล้ว เปิดรอบใหม่")}
            >
              จบรอบ
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-[var(--danger)]/40 bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] px-3 py-2 text-sm text-[var(--ink)]">
          {error}
        </p>
      ) : null}

      {loading || !board ? (
        <div className="flex min-h-40 items-center justify-center">
          {loading ? <Spinner /> : null}
        </div>
      ) : (
        <>
          <section
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] p-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, "waiting")}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  ผู้เล่นรอเล่น ({board.waiting.length} คน)
                </h2>
                <p className="text-xs text-[var(--ink-muted)]">
                  ลากไปวางที่ช่องว่าง หรือวางทับผู้เล่นเพื่อสลับทีม
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ค้นหาผู้เล่น..."
                  className="h-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    setTeamName("");
                    setAddMainLimit(String(MAIN_SLOT_LIMIT));
                    setAddReserveLimit(String(RESERVE_SLOT_LIMIT));
                    setAddOpen(true);
                  }}
                >
                  เพิ่มทีม
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    pending ||
                    board.teams.every((team) => team.main.length === 0 && team.reserve.length === 0)
                  }
                  onClick={() =>
                    void run(() => teamsService.clearTeams(), "ย้ายผู้เล่นทุกทีมกลับไปรอเล่นแล้ว")
                  }
                >
                  เคลียร์
                </Button>
                <Button
                  type="button"
                  disabled={pending || board.waiting.length === 0}
                  onClick={() => void run(() => teamsService.fill(), "จัดผู้เล่นรอเล่นเข้าทีมแล้ว")}
                >
                  + เพิ่มทั้งหมด
                </Button>
              </div>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {waiting.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">ไม่มีผู้เล่นรอเล่น</p>
              ) : (
                waiting.map((player) => (
                  <div key={player.assignmentId} className="w-56 shrink-0">
                    <PlayerChip
                      player={player}
                      onSwap={swapPlayers}
                      trailing={
                        <details className="relative">
                          <summary className="grid size-8 cursor-pointer list-none place-items-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] [&::-webkit-details-marker]:hidden">
                            <span aria-hidden>⋮</span>
                            <span className="sr-only">เมนู {player.name}</span>
                          </summary>
                          <div className="absolute right-0 z-20 mt-1 max-h-64 w-44 overflow-auto rounded-lg border border-[var(--line)] bg-[var(--surface-raised)] p-1 shadow-lg">
                            {board.teams.map((team) => (
                              <span key={team.id} className="block">
                                <button
                                  type="button"
                                  className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-hover)]"
                                  onClick={() =>
                                    void run(() =>
                                      teamsService.move({
                                        assignmentId: player.assignmentId,
                                        slotType: "main",
                                        teamId: team.id,
                                      }),
                                    )
                                  }
                                >
                                  {team.name} · หลัก
                                </button>
                                <button
                                  type="button"
                                  className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-hover)]"
                                  onClick={() =>
                                    void run(() =>
                                      teamsService.move({
                                        assignmentId: player.assignmentId,
                                        slotType: "reserve",
                                        teamId: team.id,
                                      }),
                                    )
                                  }
                                >
                                  {team.name} · สำรอง
                                </button>
                              </span>
                            ))}
                            <button
                              type="button"
                              className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-[var(--danger)] hover:bg-[var(--surface-hover)]"
                              onClick={() =>
                                void run(() =>
                                  teamsService.move({
                                    assignmentId: player.assignmentId,
                                    slotType: "inactive",
                                  }),
                                )
                              }
                            >
                              ไม่เล่นแล้ว
                            </button>
                          </div>
                        </details>
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-3">
            {board.teams.map((team) => (
              <article
                key={team.id}
                className={`rounded-2xl border bg-[var(--surface-raised)] p-4 ${
                  dragOverTeamId === team.id
                    ? "border-[var(--accent-strong)]"
                    : "border-[var(--line)]"
                }`}
                onDragOver={(event) => {
                  if (!isTeamDrag(event)) return;
                  event.preventDefault();
                  setDragOverTeamId(team.id);
                }}
                onDrop={(event) => {
                  if (isTeamDrag(event)) reorderOnto(event, team.id);
                }}
              >
                <header className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1">
                    <button
                      type="button"
                      draggable={!pending}
                      aria-label={`ย้ายตำแหน่ง ${team.name}`}
                      title="ลากเพื่อย้ายกล่องทีม"
                      className="grid size-8 shrink-0 cursor-grab place-items-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] active:cursor-grabbing"
                      onDragStart={(event) => {
                        event.dataTransfer.setData(TEAM_DRAG_TYPE, team.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragOverTeamId(null)}
                    >
                      ⠿
                    </button>
                    <h2 className="min-w-0 truncate text-sm font-semibold">{team.name}</h2>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--accent-strong)]">
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
                      aria-label={`แก้ไข ${team.name}`}
                      onClick={() => {
                        setEditTeam({ id: team.id, name: team.name });
                        setEditName(team.name);
                        setEditMainLimit(String(team.mainLimit));
                        setEditReserveLimit(String(team.reserveLimit));
                      }}
                    >
                      แก้ไข
                    </button>
                    {team.main.length} / {team.mainLimit}
                    <button
                      type="button"
                      className="grid size-8 place-items-center rounded-md text-[var(--danger)] hover:bg-[var(--surface-hover)]"
                      aria-label={`ซ่อน ${team.name}`}
                      onClick={() => setRemoveId(team.id)}
                    >
                      ✕
                    </button>
                  </span>
                </header>
                <div
                  className="space-y-2"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => onDrop(event, "main", team.id)}
                >
                  {team.main.map((player, index) => (
                    <PlayerChip
                      key={player.assignmentId}
                      player={player}
                      crowned={index === 0}
                      onSwap={swapPlayers}
                      trailing={
                        <button
                          type="button"
                          className="grid size-8 place-items-center rounded-md text-[var(--danger)] hover:bg-[var(--surface-hover)]"
                          aria-label={`เอา ${player.name} ออกจากทีม`}
                          onClick={() =>
                            void run(() =>
                              teamsService.move({
                                assignmentId: player.assignmentId,
                                slotType: "waiting",
                              }),
                            )
                          }
                        >
                          ×
                        </button>
                      }
                    />
                  ))}
                  {Array.from({ length: Math.max(0, team.mainLimit - team.main.length) }, (_, index) => (
                    <EmptySlot
                      key={`main-empty-${index}`}
                      onClick={() =>
                        setPicker({ teamId: team.id, teamName: team.name, slotType: "main" })
                      }
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {board.teams.map((team) => (
              <article
                key={`reserve-${team.id}`}
                className={`rounded-2xl border bg-[var(--surface)] p-4 ${
                  dragOverTeamId === `reserve-${team.id}`
                    ? "border-[var(--accent-strong)]"
                    : "border-[var(--line)]"
                }`}
                onDragOver={(event) => {
                  if (!isTeamDrag(event)) return;
                  event.preventDefault();
                  setDragOverTeamId(`reserve-${team.id}`);
                }}
                onDrop={(event) => {
                  if (isTeamDrag(event)) reorderOnto(event, team.id);
                }}
              >
                <header className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1">
                    <button
                      type="button"
                      draggable={!pending}
                      aria-label={`ย้ายตำแหน่งสำรอง ${team.name}`}
                      title="ลากเพื่อย้ายกล่องทีม"
                      className="grid size-8 shrink-0 cursor-grab place-items-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] active:cursor-grabbing"
                      onDragStart={(event) => {
                        event.dataTransfer.setData(TEAM_DRAG_TYPE, team.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragOverTeamId(null)}
                    >
                      ⠿
                    </button>
                    <h2 className="min-w-0 truncate text-sm font-semibold">สำรอง{team.name}</h2>
                  </span>
                  <span className="text-xs text-[var(--accent-strong)]">
                    {team.reserve.length} / {team.reserveLimit}
                  </span>
                </header>
                <div
                  className="space-y-2"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => onDrop(event, "reserve", team.id)}
                >
                  {team.reserve.map((player) => (
                    <PlayerChip
                      key={player.assignmentId}
                      player={player}
                      onSwap={swapPlayers}
                      trailing={
                        <button
                          type="button"
                          className="grid size-8 place-items-center rounded-md text-[var(--danger)] hover:bg-[var(--surface-hover)]"
                          aria-label={`เอา ${player.name} ออกจากสำรอง`}
                          onClick={() =>
                            void run(() =>
                              teamsService.move({
                                assignmentId: player.assignmentId,
                                slotType: "waiting",
                              }),
                            )
                          }
                        >
                          ×
                        </button>
                      }
                    />
                  ))}
                  {Array.from(
                    { length: Math.max(0, team.reserveLimit - team.reserve.length) },
                    (_, index) => (
                      <EmptySlot
                        key={`reserve-empty-${index}`}
                        onClick={() =>
                          setPicker({
                            teamId: team.id,
                            teamName: team.name,
                            slotType: "reserve",
                          })
                        }
                      />
                    ),
                  )}
                </div>
              </article>
            ))}
          </div>

          <section
            className="rounded-2xl border border-[color-mix(in_oklab,var(--danger)_35%,var(--line))] bg-[var(--surface-raised)] p-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, "inactive")}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  ผู้เล่นที่ไม่เล่นแล้ว ({board.inactive.length} คน)
                </h2>
                <p className="text-xs text-[var(--ink-muted)]">
                  ลากมาวางที่นี่เพื่อพักจากรอบนี้
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                disabled={pending || board.inactive.length === 0}
                onClick={() => void run(() => teamsService.clearInactive(), "ย้ายกลับไปรอเล่นแล้ว")}
              >
                ลบทั้งหมด
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {board.inactive.map((player) => (
                <div key={player.assignmentId} className="w-56">
                  <PlayerChip
                    player={player}
                    onSwap={swapPlayers}
                    trailing={
                      <button
                        type="button"
                        className="grid size-8 place-items-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface-hover)]"
                        aria-label={`ย้าย ${player.name} กลับไปรอเล่น`}
                        onClick={() =>
                          void run(() =>
                            teamsService.move({
                              assignmentId: player.assignmentId,
                              slotType: "waiting",
                            }),
                          )
                        }
                      >
                        ↩
                      </button>
                    }
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <Modal
        open={picker !== null}
        title={picker ? `เพิ่มเข้า${picker.slotType === "main" ? "หลัก" : "สำรอง"} ${picker.teamName}` : ""}
        description="เลือกจากผู้เล่นที่รอเล่น"
        onClose={() => {
          setPicker(null);
          setPickerQuery("");
        }}
      >
        <input
          value={pickerQuery}
          onChange={(event) => setPickerQuery(event.target.value)}
          placeholder="ค้นหาผู้เล่น..."
          autoFocus
          className="mb-3 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none"
        />
        <div className="max-h-80 space-y-2 overflow-auto">
          {board?.waiting.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">ไม่มีผู้เล่นรอเล่น</p>
          ) : pickerPlayers.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">ไม่พบผู้เล่น</p>
          ) : (
            pickerPlayers.map((player) => (
              <button
                key={player.assignmentId}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  if (!picker) return;
                  const target = picker;
                  setPicker(null);
                  setPickerQuery("");
                  void run(() =>
                    teamsService.move({
                      assignmentId: player.assignmentId,
                      slotType: target.slotType,
                      teamId: target.teamId,
                    }),
                  );
                }}
              >
                <PlayerFace name={player.name} />
                <span>
                  <span className="block text-sm">{player.name}</span>
                  <span className="block text-xs text-[var(--ink-muted)]">{player.memberName}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </Modal>

      <Modal
        open={addOpen}
        title="เพิ่มทีม"
        closeDisabled={pending}
        onClose={() => {
          if (!pending) setAddOpen(false);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setAddOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" form="add-team" disabled={pending || teamName.trim().length === 0}>
              เพิ่มทีม
            </Button>
          </div>
        }
      >
        <form
          id="add-team"
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const name = teamName.trim();
            const mainLimit = Number(addMainLimit);
            const reserveLimit = Number(addReserveLimit);
            if (!name) return;
            void run(
              () => teamsService.addTeam({ name, mainLimit, reserveLimit }),
              "เพิ่มทีมแล้ว",
            ).then((ok) => {
              if (ok) {
                setTeamName("");
                setAddMainLimit(String(MAIN_SLOT_LIMIT));
                setAddReserveLimit(String(RESERVE_SLOT_LIMIT));
                setAddOpen(false);
              }
            });
          }}
        >
          <label className="block text-sm" htmlFor="team-add-name">
            ชื่อทีม
          </label>
          <input
            id="team-add-name"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            placeholder="ชื่อทีม"
            maxLength={40}
            autoFocus
            className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none"
          />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="block text-sm" htmlFor="team-add-main">
              จำนวนคนในทีม
              <input
                id="team-add-main"
                type="number"
                min={1}
                max={30}
                inputMode="numeric"
                value={addMainLimit}
                onChange={(event) => setAddMainLimit(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none"
              />
            </label>
            <label className="block text-sm" htmlFor="team-add-reserve">
              จำนวนคนสำรอง
              <input
                id="team-add-reserve"
                type="number"
                min={1}
                max={30}
                inputMode="numeric"
                value={addReserveLimit}
                onChange={(event) => setAddReserveLimit(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none"
              />
            </label>
          </div>
        </form>
      </Modal>

      <Modal
        open={editTeam !== null}
        title="แก้ไขทีม"
        description={editTeam ? `ชื่อปัจจุบัน: ${editTeam.name}` : undefined}
        closeDisabled={pending}
        onClose={() => {
          if (!pending) setEditTeam(null);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setEditTeam(null)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" form="rename-team" disabled={pending || editName.trim().length === 0}>
              บันทึก
            </Button>
          </div>
        }
      >
        <form
          id="rename-team"
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!editTeam) return;
            const name = editName.trim();
            const mainLimit = Number(editMainLimit);
            const reserveLimit = Number(editReserveLimit);
            if (!name) return;
            const teamId = editTeam.id;
            void run(
              () => teamsService.updateTeam(teamId, { name, mainLimit, reserveLimit }),
              "บันทึกทีมแล้ว",
            ).then((ok) => {
              if (ok) setEditTeam(null);
            });
          }}
        >
          <label className="block text-sm" htmlFor="team-edit-name">
            ชื่อทีม
          </label>
          <input
            id="team-edit-name"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            maxLength={40}
            autoFocus
            className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none"
          />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="block text-sm" htmlFor="team-edit-main">
              จำนวนคนในทีม
              <input
                id="team-edit-main"
                type="number"
                min={1}
                max={30}
                inputMode="numeric"
                value={editMainLimit}
                onChange={(event) => setEditMainLimit(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none"
              />
            </label>
            <label className="block text-sm" htmlFor="team-edit-reserve">
              จำนวนคนสำรอง
              <input
                id="team-edit-reserve"
                type="number"
                min={1}
                max={30}
                inputMode="numeric"
                value={editReserveLimit}
                onChange={(event) => setEditReserveLimit(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none"
              />
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={removeTarget !== null}
        title="ซ่อนทีมนี้"
        description={
          removeTarget
            ? `ผู้เล่นใน ${removeTarget.name} ของรอบนี้จะกลับไปรอเล่น รอบเก่าที่เคยใช้ทีมนี้ยังอยู่`
            : ""
        }
        confirmLabel="ซ่อนทีม"
        pending={pending}
        onClose={() => {
          if (!pending) setRemoveId(null);
        }}
        onConfirm={() => {
          if (!removeId) return;
          void run(() => teamsService.removeTeam(removeId), "ซ่อนทีมแล้ว").then((ok) => {
            if (ok) setRemoveId(null);
          });
        }}
      />
    </div>
  );
}
