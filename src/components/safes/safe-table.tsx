"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { formatDepositAge } from "@/lib/display";
import { safesService } from "@/services/safes.service";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type { Safe } from "@/types/safe";

type SafeTableProps = {
  onEdit: (item: Safe) => void;
};

export function SafeTable({ onEdit }: SafeTableProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Safe | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const listQuery = useQuery({
    queryKey: ["safes", page, DEFAULT_PAGE_SIZE, search],
    queryFn: () =>
      safesService.list({ page, limit: DEFAULT_PAGE_SIZE, q: search }),
    placeholderData: (previous) => previous,
  });

  const deleteMutation = useMutation({
    mutationFn: safesService.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["safes"] });
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      setDeleteTarget(null);
      toast.success("ลบบันทึกแล้ว");
    },
    onError: (err: Error) => {
      toast.error("ลบไม่สำเร็จ", err.message);
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
        กำลังโหลดตู้เซฟ...
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
            รายการฝากในตู้เซฟ
          </h2>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหา..."
            className="sm:w-72"
            aria-label="ค้นหาตู้เซฟ"
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

      {items.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการ"
          description="กดฝากไอเท็มเพื่อเริ่มบันทึก"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-raised)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">ไอเท็ม</th>
                  <th className="px-5 py-3 font-semibold">จำนวน</th>
                  <th className="px-5 py-3 font-semibold">สมาชิก</th>
                  <th className="px-5 py-3 font-semibold">ฝากเมื่อ</th>
                  <th className="px-5 py-3 font-semibold">ฝากมาแล้ว</th>
                  <th className="px-5 py-3 font-semibold">รายละเอียด</th>
                  <th className="px-5 py-3 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[var(--line)] transition hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-5 py-3 font-medium text-[var(--ink)]">
                      {row.itemName}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {row.quantity}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {row.memberName}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {new Date(row.depositItemAt).toLocaleString("th-TH")}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {formatDepositAge(row.depositItemAt)}
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-[var(--ink-muted)]">
                      {row.description || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          onClick={() => onEdit(row)}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="h-8 px-3 text-xs"
                          disabled={deleteMutation.isPending}
                          onClick={() => setDeleteTarget(row)}
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
        title="ยืนยันการลบ"
        description={
          deleteTarget
            ? `ต้องการลบบันทึก “${deleteTarget.itemName} × ${deleteTarget.quantity}” ของ ${deleteTarget.memberName} หรือไม่?`
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
