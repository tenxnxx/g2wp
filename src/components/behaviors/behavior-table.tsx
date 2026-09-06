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
import { displayHandle } from "@/lib/display";
import { behaviorsService } from "@/services/behaviors.service";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type { Behavior } from "@/types/behavior";

type BehaviorTableProps = {
  onEdit: (behavior: Behavior) => void;
};

export function BehaviorTable({ onEdit }: BehaviorTableProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Behavior | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const behaviorsQuery = useQuery({
    queryKey: ["behaviors", page, DEFAULT_PAGE_SIZE, search],
    queryFn: () =>
      behaviorsService.list({ page, limit: DEFAULT_PAGE_SIZE, q: search }),
    placeholderData: (previous) => previous,
  });

  const deleteMutation = useMutation({
    mutationFn: behaviorsService.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["behaviors"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setDeleteTarget(null);
      toast.success("ลบพฤติกรรมแล้ว");
    },
    onError: (err: Error) => {
      toast.error("ลบพฤติกรรมไม่สำเร็จ", err.message);
    },
  });

  async function handleRefresh() {
    const result = await behaviorsQuery.refetch();
    if (result.isError) {
      toast.error("รีเฟรชไม่สำเร็จ", (result.error as Error).message);
      return;
    }
    toast.success("รีเฟรชข้อมูลแล้ว");
  }

  const meta = behaviorsQuery.data?.meta;
  const behaviors = behaviorsQuery.data?.data ?? [];

  if (meta && page > meta.totalPages) {
    setPage(meta.totalPages);
  }

  if (behaviorsQuery.isLoading && !behaviorsQuery.data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-muted)]">
        <Spinner />
        กำลังโหลดพฤติกรรม...
      </div>
    );
  }

  if (behaviorsQuery.isError) {
    return (
      <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--surface)] p-6 text-sm text-[var(--danger)]">
        โหลดข้อมูลไม่สำเร็จ: {(behaviorsQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            รายการพฤติกรรม
          </h2>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหา..."
            className="sm:w-56"
            aria-label="ค้นหาพฤติกรรมด้วยรายละเอียด"
          />
          {searchInput ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
            >
              ล้าง
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleRefresh()}
            disabled={behaviorsQuery.isFetching}
          >
            {behaviorsQuery.isFetching ? <Spinner /> : null}
            รีเฟรช
          </Button>
        </div>
      </div>

      {behaviors.length === 0 ? (
        <EmptyState
          title="ไม่มีข้อมูล"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-raised)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">รายละเอียด</th>
                  <th className="px-5 py-3 font-semibold">หลักฐาน</th>
                  <th className="px-5 py-3 font-semibold">สมาชิก</th>
                  <th className="px-5 py-3 font-semibold">ชื่อตัวละคร</th>
                  <th className="px-5 py-3 font-semibold">สร้างโดย</th>
                  <th className="px-5 py-3 font-semibold">สร้างเมื่อ</th>
                  <th className="px-5 py-3 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {behaviors.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-[var(--line)] transition hover:bg-[var(--surface-hover)]"
                  >
                    <td className="max-w-xs px-5 py-3 font-medium text-[var(--ink)]">
                      <span className="line-clamp-2">{item.description}</span>
                    </td>
                    <td className="max-w-[12rem] px-5 py-3">
                      {item.evidenceUrl ? (
                        <a
                          href={item.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="line-clamp-1 break-all text-[var(--accent-strong)] underline-offset-2 hover:underline"
                        >
                          เปิดลิงก์
                        </a>
                      ) : (
                        <span className="text-[var(--ink-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent-strong)]">
                        {item.member.name}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {item.player.name}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {displayHandle(item.createBy)}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {new Date(item.createdAt).toLocaleString("th-TH")}
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
        title="ยืนยันการลบพฤติกรรม"
        description={
          deleteTarget
            ? `ต้องการลบพฤติกรรมของ “${deleteTarget.member.name} / ${deleteTarget.player.name}” หรือไม่?`
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
