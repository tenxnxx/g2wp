"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { displayHandle } from "@/lib/display";
import { checkEventsService } from "@/services/check-events.service";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type { CheckEvent, CheckEventStatus } from "@/types/check-event";

type CheckEventTableProps = {
  onEdit: (item: CheckEvent) => void;
};

const STATUS_LABEL: Record<CheckEventStatus, string> = {
  draft: "ร่าง",
  open: "กำลังเช็ค",
  closed: "ปิดแล้ว",
};

function statusClass(status: CheckEventStatus) {
  if (status === "open") {
    return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  }
  if (status === "closed") {
    return "bg-[var(--surface-raised)] text-[var(--ink-muted)]";
  }
  return "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[var(--warning)]";
}

export function CheckEventTable({ onEdit }: CheckEventTableProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CheckEventStatus | "all">(
    "all",
  );
  const [deleteTarget, setDeleteTarget] = useState<CheckEvent | null>(null);
  const [openTarget, setOpenTarget] = useState<CheckEvent | null>(null);
  const [closeTarget, setCloseTarget] = useState<CheckEvent | null>(null);

  const listQuery = useQuery({
    queryKey: ["check-events", page, DEFAULT_PAGE_SIZE, statusFilter],
    queryFn: () =>
      checkEventsService.list({
        page,
        limit: DEFAULT_PAGE_SIZE,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    placeholderData: (previous) => previous,
  });

  const deleteMutation = useMutation({
    mutationFn: checkEventsService.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["check-events"] });
      await queryClient.invalidateQueries({ queryKey: ["set-dates"] });
      setDeleteTarget(null);
      toast.success("ลบอีเวนต์แล้ว");
    },
    onError: (err: Error) => toast.error("ลบอีเวนต์ไม่สำเร็จ", err.message),
  });

  const openMutation = useMutation({
    mutationFn: checkEventsService.open,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["check-events"] });
      setOpenTarget(null);
      toast.success("เปิดเช็คแล้ว — snapshot สมาชิกเรียบร้อย");
    },
    onError: (err: Error) => toast.error("เปิดเช็คไม่สำเร็จ", err.message),
  });

  const closeMutation = useMutation({
    mutationFn: checkEventsService.close,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["check-events"] });
      setCloseTarget(null);
      toast.success("ปิดอีเวนต์แล้ว");
    },
    onError: (err: Error) => toast.error("ปิดอีเวนต์ไม่สำเร็จ", err.message),
  });

  async function handleRefresh() {
    const result = await listQuery.refetch();
    if (result.isError) {
      toast.error("รีเฟรชไม่สำเร็จ", (result.error as Error).message);
      return;
    }
    toast.success("รีเฟรชข้อมูลแล้ว");
  }

  const meta = listQuery.data?.meta;
  const items = listQuery.data?.data ?? [];

  if (meta && page > meta.totalPages) {
    setPage(meta.totalPages);
  }

  if (listQuery.isLoading && !listQuery.data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-muted)]">
        <Spinner />
        กำลังโหลดอีเวนต์...
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
      <div className="flex flex-col gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            รายการอีเวนต์วันเช็ค
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">
            ทั้งหมด {meta?.total ?? 0} รายการ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "ทั้งหมด"],
              ["draft", "ร่าง"],
              ["open", "กำลังเช็ค"],
              ["closed", "ปิดแล้ว"],
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
                  : "border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {label}
            </button>
          ))}
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

      {items.length === 0 ? (
        <EmptyState
          title="ไม่มีอีเวนต์"
          description="กด “สร้างอีเวนต์” เพื่อเริ่มกำหนดวันเช็ค"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-raised)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">วันเช็ค</th>
                  <th className="px-5 py-3 font-semibold">ชื่อ</th>
                  <th className="px-5 py-3 font-semibold">สถานะ</th>
                  <th className="px-5 py-3 font-semibold">สรุป</th>
                  <th className="px-5 py-3 font-semibold">สร้างโดย</th>
                  <th className="px-5 py-3 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-[var(--line)] transition hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-5 py-3 font-medium text-[var(--ink)]">
                      {new Date(
                        `${item.setDate.date}T00:00:00`,
                      ).toLocaleDateString("th-TH")}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {item.title || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(item.status)}`}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {item.status === "draft"
                        ? "ยังไม่เปิดเช็ค"
                        : `${item.counts.pending} รอ · ${item.counts.approved} อนุมัติ · ${item.counts.cancelled} ยกเลิก`}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {displayHandle(item.createBy)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {item.status === "draft" ? (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-8 px-3 text-xs"
                              onClick={() => onEdit(item)}
                            >
                              แก้ไข
                            </Button>
                            <Button
                              type="button"
                              className="h-8 px-3 text-xs"
                              onClick={() => setOpenTarget(item)}
                            >
                              เปิดเช็ค
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              className="h-8 px-3 text-xs"
                              onClick={() => setDeleteTarget(item)}
                            >
                              ลบ
                            </Button>
                          </>
                        ) : null}
                        {item.status === "open" || item.status === "closed" ? (
                          <Link href={`/check-events/${item.id}`}>
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-8 px-3 text-xs"
                            >
                              {item.status === "open" ? "เข้าเช็ค" : "ดูผล"}
                            </Button>
                          </Link>
                        ) : null}
                        {item.status === "open" && item.counts.pending === 0 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-3 text-xs"
                            onClick={() => setCloseTarget(item)}
                          >
                            ปิดอีเวนต์
                          </Button>
                        ) : null}
                        {item.status === "closed" ? (
                          <Button
                            type="button"
                            variant="danger"
                            className="h-8 px-3 text-xs"
                            onClick={() => setDeleteTarget(item)}
                          >
                            ลบ
                          </Button>
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

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="ยืนยันการลบอีเวนต์"
        description={
          deleteTarget
            ? `ต้องการลบอีเวนต์วัน ${new Date(`${deleteTarget.setDate.date}T00:00:00`).toLocaleDateString("th-TH")} หรือไม่?`
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

      <ConfirmModal
        open={Boolean(openTarget)}
        title="เปิดเช็คอีเวนต์"
        description={
          openTarget
            ? `จะดึงสมาชิกที่อยู่ในแคลน (isLive = true) เข้าอีเวนต์นี้ และเริ่มเช็คได้ทันที`
            : ""
        }
        confirmLabel="เปิดเช็ค"
        pending={openMutation.isPending}
        onClose={() => {
          if (!openMutation.isPending) setOpenTarget(null);
        }}
        onConfirm={() => {
          if (openTarget) openMutation.mutate(openTarget.id);
        }}
      />

      <ConfirmModal
        open={Boolean(closeTarget)}
        title="ปิดอีเวนต์"
        description="ปิดได้เฉพาะเมื่ออนุมัติ/ยกเลิกครบแล้วเท่านั้น"
        confirmLabel="ปิดอีเวนต์"
        pending={closeMutation.isPending}
        onClose={() => {
          if (!closeMutation.isPending) setCloseTarget(null);
        }}
        onConfirm={() => {
          if (closeTarget) closeMutation.mutate(closeTarget.id);
        }}
      />
    </div>
  );
}
