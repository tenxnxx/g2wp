"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { MemberDetailModal } from "@/components/members/member-detail-modal";
import { useToast } from "@/context/toast-context";
import { displayHandle } from "@/lib/display";
import { checkEventsService } from "@/services/check-events.service";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type {
  CheckEventMember,
  CheckMemberStatus,
} from "@/types/check-event";

type CheckEventDetailClientProps = {
  eventId: string;
};

const MEMBER_STATUS_LABEL: Record<CheckMemberStatus, string> = {
  pending: "รอเช็ค",
  approved: "อนุมัติ",
  cancelled: "ยกเลิก",
};

export function CheckEventDetailClient({
  eventId,
}: CheckEventDetailClientProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CheckMemberStatus | "all">(
    "pending",
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [approveTarget, setApproveTarget] = useState<CheckEventMember | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] = useState<CheckEventMember | null>(
    null,
  );
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const eventQuery = useQuery({
    queryKey: ["check-events", eventId],
    queryFn: () => checkEventsService.get(eventId),
  });

  const membersQuery = useQuery({
    queryKey: [
      "check-events",
      eventId,
      "members",
      page,
      DEFAULT_PAGE_SIZE,
      statusFilter,
      search,
    ],
    queryFn: () =>
      checkEventsService.listMembers(eventId, {
        page,
        limit: DEFAULT_PAGE_SIZE,
        status: statusFilter,
        q: search,
      }),
    placeholderData: (previous) => previous,
    enabled: Boolean(eventQuery.data),
  });

  const decideMutation = useMutation({
    mutationFn: (input: {
      memberId: string;
      status: "approved" | "cancelled";
    }) => checkEventsService.decide(eventId, input.memberId, {
      status: input.status,
    }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["check-events", eventId] }),
        queryClient.invalidateQueries({
          queryKey: ["check-events", eventId, "members"],
        }),
        queryClient.invalidateQueries({ queryKey: ["check-events"] }),
        queryClient.invalidateQueries({ queryKey: ["members"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      setApproveTarget(null);
      setCancelTarget(null);
      if (result.event.status === "closed") {
        toast.success("บันทึกผลเช็คครบแล้ว — ปิดอีเวนต์อัตโนมัติ");
      } else {
        toast.success("บันทึกผลเช็คแล้ว");
      }
    },
    onError: (err: Error) => toast.error("บันทึกผลเช็คไม่สำเร็จ", err.message),
  });

  const closeMutation = useMutation({
    mutationFn: () => checkEventsService.close(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["check-events"] });
      toast.success("ปิดอีเวนต์แล้ว");
    },
    onError: (err: Error) => toast.error("ปิดอีเวนต์ไม่สำเร็จ", err.message),
  });

  const event = eventQuery.data;
  const meta = membersQuery.data?.meta;
  const members = membersQuery.data?.data ?? [];
  const canDecide = event?.status === "open";
  const canClose =
    event?.status === "open" && (event.counts.pending ?? 0) === 0;

  if (meta && page > meta.totalPages) {
    setPage(meta.totalPages);
  }

  if (eventQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-muted)]">
        <Spinner />
        กำลังโหลดอีเวนต์...
      </div>
    );
  }

  if (eventQuery.isError || !event) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--surface)] p-6 text-sm text-[var(--danger)]">
          โหลดอีเวนต์ไม่สำเร็จ:{" "}
          {(eventQuery.error as Error | undefined)?.message ?? "ไม่พบข้อมูล"}
        </div>
        <Link href="/check-events">
          <Button type="button" variant="secondary">
            กลับไปรายการอีเวนต์
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/check-events"
            className="text-xs text-[var(--ink-muted)] hover:text-[var(--accent-strong)]"
          >
            ← อีเวนต์วันเช็ค
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)]">
            {event.title || "เช็คสมาชิก"}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            วันเช็ค{" "}
            {new Date(`${event.setDate.date}T00:00:00`).toLocaleDateString(
              "th-TH",
            )}{" "}
            · สถานะ{" "}
            {event.status === "open"
              ? "กำลังเช็ค"
              : event.status === "closed"
                ? "ปิดแล้ว"
                : "ร่าง"}
          </p>
        </div>
        {event.status === "open" ? (
          canClose ? (
            <Button
              type="button"
              variant="secondary"
              disabled={closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
            >
              {closeMutation.isPending ? <Spinner /> : null}
              ปิดอีเวนต์
            </Button>
          ) : (
            <p className="max-w-xs text-left text-xs text-[var(--ink-muted)] sm:text-right">
              ปิดอัตโนมัติเมื่ออนุมัติ/ยกเลิกครบ
              {event.counts.pending > 0
                ? ` (เหลือรอเช็ค ${event.counts.pending} คน)`
                : ""}
            </p>
          )
        ) : null}
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        {(
          [
            ["ทั้งหมด", event.counts.total],
            ["รอเช็ค", event.counts.pending],
            ["อนุมัติ", event.counts.approved],
            ["ยกเลิก", event.counts.cancelled],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
          >
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-muted)]">
              {label}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
              {value}
            </p>
          </div>
        ))}
      </section>

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-3 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["pending", "รอเช็ค"],
                ["approved", "อนุมัติแล้ว"],
                ["cancelled", "ยกเลิกแล้ว"],
                ["all", "ทั้งหมด"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === value
                    ? "bg-[var(--accent)] text-[var(--ink)]"
                    : "border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink-muted)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหาด้วยชื่อ..."
            className="md:w-56"
          />
        </div>

        {membersQuery.isLoading && !membersQuery.data ? (
          <div className="flex items-center gap-2 p-8 text-sm text-[var(--ink-muted)]">
            <Spinner />
            กำลังโหลดรายชื่อ...
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            title="ไม่มีรายการ"
            description={
              search
                ? `ไม่พบสมาชิกที่ตรงกับ “${search}”`
                : "ไม่มีสมาชิกในตัวกรองนี้"
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--surface-raised)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">ชื่อ</th>
                    <th className="px-5 py-3 font-semibold">อายุ</th>
                    <th className="px-5 py-3 font-semibold">สถานะในอีเวนต์</th>
                    <th className="px-5 py-3 font-semibold">ตัดสินโดย</th>
                    <th className="px-5 py-3 font-semibold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-[var(--line)] transition hover:bg-[var(--surface-hover)]"
                    >
                      <td className="px-5 py-3 font-medium text-[var(--ink)]">
                        {row.memberNameSnapshot}
                      </td>
                      <td className="px-5 py-3 text-[var(--ink-muted)]">
                        {row.member.age}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex rounded-full bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--ink-muted)]">
                          {MEMBER_STATUS_LABEL[row.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[var(--ink-muted)]">
                        {row.decidedBy ? (
                          <>
                            {displayHandle(row.decidedBy)}
                            {row.decidedAt
                              ? ` · ${new Date(row.decidedAt).toLocaleString("th-TH")}`
                              : ""}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-10 gap-1.5 px-3 text-xs"
                            aria-label={`ดูรายละเอียด ${row.memberNameSnapshot}`}
                            title="ดูรายละเอียด"
                            onClick={() => setDetailMemberId(row.memberId)}
                          >
                            <EyeIcon />
                            ดู
                          </Button>
                          {canDecide && row.status === "pending" ? (
                            <>
                              <Button
                                type="button"
                                className="h-10 px-3 text-xs"
                                disabled={decideMutation.isPending}
                                onClick={() => setApproveTarget(row)}
                              >
                                อนุมัติ
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                className="h-10 px-3 text-xs"
                                disabled={decideMutation.isPending}
                                onClick={() => setCancelTarget(row)}
                              >
                                ยกเลิก
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta ? (
              <div className="border-t border-[var(--line)] px-5 py-4">
                <Pagination meta={meta} onPageChange={setPage} />
              </div>
            ) : null}
          </>
        )}
      </div>

      <ConfirmModal
        open={Boolean(approveTarget)}
        title="ยืนยันอนุมัติสมาชิก"
        description={
          approveTarget
            ? `อนุมัติ “${approveTarget.memberNameSnapshot}” จะตั้งสถานะเป็นอยู่แล้ว (isLive = true)`
            : ""
        }
        confirmLabel="อนุมัติ"
        pending={decideMutation.isPending}
        onClose={() => {
          if (!decideMutation.isPending) setApproveTarget(null);
        }}
        onConfirm={() => {
          if (!approveTarget) return;
          decideMutation.mutate({
            memberId: approveTarget.memberId,
            status: "approved",
          });
        }}
      />

      <ConfirmModal
        open={Boolean(cancelTarget)}
        title="ยืนยันยกเลิกสมาชิก"
        description={
          cancelTarget
            ? `ยกเลิก “${cancelTarget.memberNameSnapshot}” จะตั้งสถานะเป็นไม่อยู่แล้ว (isLive = false)`
            : ""
        }
        confirmLabel="ยกเลิกสมาชิก"
        pending={decideMutation.isPending}
        onClose={() => {
          if (!decideMutation.isPending) setCancelTarget(null);
        }}
        onConfirm={() => {
          if (!cancelTarget) return;
          decideMutation.mutate({
            memberId: cancelTarget.memberId,
            status: "cancelled",
          });
        }}
      />

      <MemberDetailModal
        open={Boolean(detailMemberId)}
        memberId={detailMemberId}
        onClose={() => setDetailMemberId(null)}
      />
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
      />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
