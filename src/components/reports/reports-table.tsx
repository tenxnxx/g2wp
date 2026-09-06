"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { displayHandle } from "@/lib/display";
import { reportsService } from "@/services/reports.service";
import type { BehaviorReportStatus } from "@/types/behavior-report";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

const STATUS_LABEL: Record<BehaviorReportStatus, string> = {
  pending: "รอตรวจ",
  approved: "อนุมัติแล้ว",
  cancelled: "ยกเลิกแล้ว",
};

function statusClass(status: BehaviorReportStatus) {
  if (status === "pending") {
    return "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[var(--warning)]";
  }
  if (status === "approved") {
    return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  }
  return "bg-[var(--surface-raised)] text-[var(--ink-muted)]";
}

export function ReportsTable() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    BehaviorReportStatus | "all"
  >("pending");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const listQuery = useQuery({
    queryKey: ["reports", page, DEFAULT_PAGE_SIZE, statusFilter, search],
    queryFn: () =>
      reportsService.list({
        page,
        limit: DEFAULT_PAGE_SIZE,
        status: statusFilter,
        q: search || undefined,
      }),
    placeholderData: (previous) => previous,
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
        กำลังโหลดรายงาน...
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["pending", "รอตรวจ"],
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
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === value
                  ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleRefresh()}
          disabled={listQuery.isFetching}
        >
          {listQuery.isFetching ? <Spinner className="mr-2" /> : null}
          รีเฟรช
        </Button>
      </div>

      <Input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="ค้นหาข้อความ / ชื่อสมาชิก / ตัวละคร..."
      />

      {items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          <EmptyState
            title="ไม่มีรายงาน"
            description={
              search
                ? `ไม่พบรายงานที่ตรงกับ “${search}”`
                : "ยังไม่มีรายงานในสถานะนี้"
            }
          />
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--surface-raised)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">สถานะ</th>
                    <th className="px-5 py-3 font-semibold">สมาชิก</th>
                    <th className="px-5 py-3 font-semibold">ตัวละคร</th>
                    <th className="px-5 py-3 font-semibold">ข้อความ</th>
                    <th className="px-5 py-3 font-semibold">ส่งเมื่อ</th>
                    <th className="px-5 py-3 font-semibold">ผู้ตัดสิน</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--line)]">
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(item.status)}`}
                        >
                          {STATUS_LABEL[item.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-[var(--ink)]">
                        {item.memberNameSnap}
                      </td>
                      <td className="px-5 py-3 text-[var(--ink-muted)]">
                        {item.playerNameSnap}
                      </td>
                      <td className="max-w-xs px-5 py-3 text-[var(--ink)]">
                        <span className="line-clamp-2">{item.message}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[var(--ink-muted)]">
                        {new Date(item.createdAt).toLocaleString("th-TH")}
                      </td>
                      <td className="px-5 py-3 text-[var(--ink-muted)]">
                        {item.decidedBy
                          ? displayHandle(item.decidedBy)
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/reports/${item.id}`}
                          className="text-sm font-medium text-[var(--accent-strong)] hover:underline"
                        >
                          ดูรายละเอียด
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {meta ? (
            <Pagination meta={meta} onPageChange={setPage} />
          ) : null}
        </>
      )}
    </div>
  );
}
