"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { displayHandle } from "@/lib/display";
import { EMPTY_ARRAY } from "@/lib/empty";
import { dashboardService } from "@/services/dashboard.service";
import type { MemberDetail } from "@/types/member";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)]">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--ink)]">
        {value}
      </p>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">{hint}</p>
    </div>
  );
}

function MemberDetailPanel({ member }: { member: MemberDetail }) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
                {member.name}
              </h2>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  member.isLive
                    ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "bg-[var(--surface-raised)] text-[var(--ink-muted)]"
                }`}
              >
                {member.isLive ? "อยู่ในแคลน" : "ไม่อยู่แล้ว"}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              อายุ {member.age} ปี
              {member.facebookUrl ? (
                <>
                  {" · "}
                  <a
                    href={member.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
                  >
                    Facebook
                  </a>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-[var(--ink-faint)]">
              สร้างเมื่อ {new Date(member.createdAt).toLocaleString("th-TH")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[240px]">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-4 py-3">
              <p className="text-xs text-[var(--ink-muted)]">ตัวละคร</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
                {member.playerCount}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-4 py-3">
              <p className="text-xs text-[var(--ink-muted)]">พฤติกรรม</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
                {member.behaviorCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-base font-semibold">
              ตัวละคร (Player)
            </h3>
            <p className="text-sm text-[var(--ink-muted)]">
              {member.playerCount} ตัวละคร
            </p>
          </div>
          <Link
            href="/players"
            className="text-sm font-medium text-[var(--accent-strong)] hover:underline"
          >
            จัดการตัวละคร
          </Link>
        </div>

        {member.players.length === 0 ? (
          <EmptyState
            title="ไม่มีข้อมูล"
            description="สมาชิกนี้ยังไม่มีตัวละคร"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-raised)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">ชื่อตัวละคร</th>
                  <th className="px-5 py-3 font-semibold">สร้างโดย</th>
                  <th className="px-5 py-3 font-semibold">สร้างเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {member.players.map((player) => (
                  <tr
                    key={player.id}
                    className="border-t border-[var(--line)]"
                  >
                    <td className="px-5 py-3 font-medium text-[var(--ink)]">
                      {player.name}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {displayHandle(player.createBy)}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {new Date(player.createdAt).toLocaleString("th-TH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-base font-semibold">
              พฤติกรรม
            </h3>
            <p className="text-sm text-[var(--ink-muted)]">
              {member.behaviorCount} ครั้ง
            </p>
          </div>
          <Link
            href="/behaviors"
            className="text-sm font-medium text-[var(--accent-strong)] hover:underline"
          >
            จัดการพฤติกรรม
          </Link>
        </div>

        {member.behaviors.length === 0 ? (
          <EmptyState
            title="ไม่มีข้อมูล"
            description="สมาชิกนี้ยังไม่มีบันทึกพฤติกรรม"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-raised)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">รายละเอียด</th>
                  <th className="px-5 py-3 font-semibold">ตัวละคร</th>
                  <th className="px-5 py-3 font-semibold">สร้างโดย</th>
                  <th className="px-5 py-3 font-semibold">สร้างเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {member.behaviors.map((behavior) => (
                  <tr
                    key={behavior.id}
                    className="border-t border-[var(--line)]"
                  >
                    <td className="max-w-sm px-5 py-3 font-medium text-[var(--ink)]">
                      <span className="line-clamp-2">
                        {behavior.description}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent-strong)]">
                        {behavior.player.name}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {displayHandle(behavior.createBy)}
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {new Date(behavior.createdAt).toLocaleString("th-TH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function DashboardPageClient() {
  const toast = useToast();
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardService.getOverview,
  });

  const members = dashboardQuery.data?.members ?? EMPTY_ARRAY;
  const [selectedId, setSelectedId] = useState<string>("");
  const effectiveSelectedId =
    members.length === 0
      ? ""
      : members.some((m) => m.id === selectedId)
        ? selectedId
        : members[0].id;

  const detailQuery = useQuery({
    queryKey: ["dashboard", "member", effectiveSelectedId],
    queryFn: () => dashboardService.getMemberDetail(effectiveSelectedId),
    enabled: Boolean(effectiveSelectedId),
  });

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        value: member.id,
        label: `${member.name} — ${member.playerCount} ตัวละคร · ${member.behaviorCount} พฤติกรรม`,
        keywords: member.name,
      })),
    [members],
  );

  async function handleRefresh() {
    const result = await dashboardQuery.refetch();
    if (effectiveSelectedId) {
      await detailQuery.refetch();
    }
    if (result.isError) {
      toast.error("รีเฟรชไม่สำเร็จ", (result.error as Error).message);
      return;
    }
    toast.success("รีเฟรชแดชบอร์ดแล้ว");
  }

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-muted)]">
        <Spinner />
        กำลังโหลดแดชบอร์ด...
      </div>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--surface)] p-6 text-sm text-[var(--danger)]">
        โหลดข้อมูลไม่สำเร็จ: {(dashboardQuery.error as Error).message}
      </div>
    );
  }

  const summary = dashboardQuery.data!.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)]">
            แดชบอร์ด
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            ดูรายละเอียดสมาชิกแต่ละคน พร้อมตัวละครและพฤติกรรม
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={dashboardQuery.isFetching || detailQuery.isFetching}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-raised)] px-4 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
        >
          {dashboardQuery.isFetching || detailQuery.isFetching ? (
            <Spinner className="mr-2" />
          ) : null}
          รีเฟรช
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="สมาชิก"
          value={summary.members}
          hint="ทั้งหมดในระบบ"
        />
        <StatCard
          label="ตัวละคร"
          value={summary.players}
          hint="Player ทั้งหมด"
        />
        <StatCard
          label="พฤติกรรม"
          value={summary.behaviors}
          hint="บันทึกทั้งหมด"
        />
      </section>

      {members.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          <EmptyState
            title="ไม่มีข้อมูล"
            description="ยังไม่มีสมาชิก — ไปเพิ่มที่หน้าสมาชิกก่อน"
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5">
            <Label htmlFor="dashboard-member">เลือกสมาชิก</Label>
            <SearchableSelect
              id="dashboard-member"
              value={effectiveSelectedId}
              onChange={setSelectedId}
              options={memberOptions}
              placeholder="เลือกสมาชิก"
              searchPlaceholder="ค้นหาด้วยชื่อ..."
              emptyMessage="ไม่พบสมาชิกที่ตรงกับคำค้น"
              className="max-w-md"
            />
          </div>

          {detailQuery.isLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-muted)]">
              <Spinner />
              กำลังโหลดรายละเอียดสมาชิก...
            </div>
          ) : null}

          {detailQuery.isError ? (
            <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--surface)] p-6 text-sm text-[var(--danger)]">
              โหลดรายละเอียดไม่สำเร็จ:{" "}
              {(detailQuery.error as Error).message}
            </div>
          ) : null}

          {detailQuery.data ? (
            <MemberDetailPanel member={detailQuery.data} />
          ) : null}
        </div>
      )}
    </div>
  );
}
