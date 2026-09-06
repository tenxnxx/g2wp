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
import { membersService } from "@/services/members.service";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type { Member } from "@/types/member";

type MemberTableProps = {
  onEdit: (member: Member) => void;
};

export function MemberTable({ onEdit }: MemberTableProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const membersQuery = useQuery({
    queryKey: ["members", page, DEFAULT_PAGE_SIZE, search],
    queryFn: () =>
      membersService.list({ page, limit: DEFAULT_PAGE_SIZE, q: search }),
    placeholderData: (previous) => previous,
  });

  const deleteMutation = useMutation({
    mutationFn: membersService.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setDeleteTarget(null);
      toast.success("ลบสมาชิกแล้ว");
    },
    onError: (err: Error) => {
      toast.error("ลบสมาชิกไม่สำเร็จ", err.message);
    },
  });

  async function handleRefresh() {
    const result = await membersQuery.refetch();
    if (result.isError) {
      toast.error("รีเฟรชไม่สำเร็จ", (result.error as Error).message);
      return;
    }
    toast.success("รีเฟรชข้อมูลแล้ว");
  }

  const meta = membersQuery.data?.meta;
  const members = membersQuery.data?.data ?? [];

  if (meta && page > meta.totalPages) {
    setPage(meta.totalPages);
  }

  if (membersQuery.isLoading && !membersQuery.data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-muted)]">
        <Spinner />
        กำลังโหลดสมาชิก...
      </div>
    );
  }

  if (membersQuery.isError) {
    return (
      <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--surface)] p-6 text-sm text-[var(--danger)]">
        โหลดข้อมูลไม่สำเร็จ: {(membersQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            รายชื่อสมาชิก
          </h2>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหา..."
            className="sm:w-56"
            aria-label="ค้นหาสมาชิกด้วยชื่อ"
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
            disabled={membersQuery.isFetching}
          >
            {membersQuery.isFetching ? <Spinner /> : null}
            รีเฟรช
          </Button>
        </div>
      </div>

      {members.length === 0 ? (
        <EmptyState
          title="ไม่มีข้อมูล"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-raised)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">ชื่อ</th>
                  <th className="px-5 py-3 font-semibold">กลุ่ม</th>
                  <th className="px-5 py-3 font-semibold">อายุ</th>
                  <th className="px-5 py-3 font-semibold">สถานะ</th>
                  <th className="px-5 py-3 font-semibold">Facebook</th>
                  <th className="px-5 py-3 font-semibold">สร้างโดย</th>
                  <th className="px-5 py-3 font-semibold">สร้างเมื่อ</th>
                  <th className="px-5 py-3 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-t border-[var(--line)] transition hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-5 py-3 font-medium text-[var(--ink)]">
                      {member.name}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {member.groupName ?? (
                        <span className="text-[var(--ink-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {member.age}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          member.isLive
                            ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                            : "bg-[var(--surface-raised)] text-[var(--ink-muted)]"
                        }`}
                      >
                        {member.isLive ? "อยู่ในแคลน" : "ไม่อยู่แล้ว"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {member.facebookUrl ? (
                        <a
                          href={member.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
                        >
                          เปิดลิงก์
                        </a>
                      ) : (
                        <span className="text-[var(--ink-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {displayHandle(member.createBy)}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {new Date(member.createdAt).toLocaleString("th-TH")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          onClick={() => onEdit(member)}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="h-8 px-3 text-xs"
                          disabled={deleteMutation.isPending}
                          onClick={() => setDeleteTarget(member)}
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
        title="ยืนยันการลบสมาชิก"
        description={
          deleteTarget
            ? `ต้องการลบสมาชิก “${deleteTarget.name}” หรือไม่?`
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
