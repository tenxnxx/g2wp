"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { displayHandle } from "@/lib/display";
import { setDatesService } from "@/services/set-dates.service";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type { SetDate } from "@/types/set-date";

type SetDateTableProps = {
  onEdit: (item: SetDate) => void;
};

export function SetDateTable({ onEdit }: SetDateTableProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<SetDate | null>(null);

  const listQuery = useQuery({
    queryKey: ["set-dates", page, DEFAULT_PAGE_SIZE],
    queryFn: () => setDatesService.list({ page, limit: DEFAULT_PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const deleteMutation = useMutation({
    mutationFn: setDatesService.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["set-dates"] });
      setDeleteTarget(null);
      toast.success("ลบวันที่แล้ว");
    },
    onError: (err: Error) => {
      toast.error("ลบวันที่ไม่สำเร็จ", err.message);
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

  const meta = listQuery.data?.meta;
  const items = listQuery.data?.data ?? [];

  if (meta && page > meta.totalPages) {
    setPage(meta.totalPages);
  }

  if (listQuery.isLoading && !listQuery.data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-muted)]">
        <Spinner />
        กำลังโหลดวันที่...
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
            รายการกำหนดวันเช็ค
          </h2>
        </div>
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

      {items.length === 0 ? (
        <EmptyState
          title="ไม่มีข้อมูล"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-raised)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">วันที่</th>
                  <th className="px-5 py-3 font-semibold">อีเวนต์</th>
                  <th className="px-5 py-3 font-semibold">สร้างโดย</th>
                  <th className="px-5 py-3 font-semibold">สร้างเมื่อ</th>
                  <th className="px-5 py-3 font-semibold">อัปเดตเมื่อ</th>
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
                      {new Date(`${item.date}T00:00:00`).toLocaleDateString(
                        "th-TH",
                      )}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {item.eventCount ?? 0}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {displayHandle(item.createBy)}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {new Date(item.createdAt).toLocaleString("th-TH")}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {new Date(item.updatedAt).toLocaleString("th-TH")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
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
                          variant="danger"
                          className="h-8 px-3 text-xs"
                          disabled={deleteMutation.isPending}
                          onClick={() => setDeleteTarget(item)}
                        >
                          ลบ
                        </Button>
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
        title="ยืนยันการลบวันที่"
        description={
          deleteTarget
            ? `ต้องการลบวันที่ ${new Date(`${deleteTarget.date}T00:00:00`).toLocaleDateString("th-TH")} หรือไม่?`
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
