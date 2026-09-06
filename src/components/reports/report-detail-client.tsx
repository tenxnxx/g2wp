"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/context/toast-context";
import { displayHandle } from "@/lib/display";
import { reportsService } from "@/services/reports.service";
import type { BehaviorReportStatus } from "@/types/behavior-report";

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

type Props = { reportId: string };

export function ReportDetailClient({ reportId }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["reports", reportId],
    queryFn: () => reportsService.get(reportId),
  });

  const decideMutation = useMutation({
    mutationFn: (status: "approved" | "cancelled") =>
      reportsService.decide(reportId, {
        status,
        note: note.trim() || null,
      }),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: ["reports", reportId] }),
        queryClient.invalidateQueries({ queryKey: ["behaviors"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      setApproveOpen(false);
      setCancelOpen(false);
      toast.success(
        data.status === "approved"
          ? "อนุมัติแล้ว — บันทึกเป็นพฤติกรรมแล้ว"
          : "ยกเลิกรายงานแล้ว — เก็บประวัติไว้",
      );
    },
    onError: (err: Error) => toast.error("ตัดสินใจไม่สำเร็จ", err.message),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-muted)]">
        <Spinner />
        กำลังโหลดรายงาน...
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--surface)] p-6 text-sm text-[var(--danger)]">
        โหลดรายงานไม่สำเร็จ:{" "}
        {(detailQuery.error as Error | undefined)?.message ?? "ไม่พบข้อมูล"}
      </div>
    );
  }

  const report = detailQuery.data;
  const pending = report.status === "pending";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/reports"
            className="text-sm font-medium text-[var(--accent-strong)] hover:underline"
          >
            ← กลับรายการรายงาน
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
            รายละเอียดรายงาน
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            ส่งเมื่อ {new Date(report.createdAt).toLocaleString("th-TH")}
          </p>
        </div>
        <span
          className={`inline-flex self-start rounded-full px-3 py-1.5 text-xs font-medium ${statusClass(report.status)}`}
        >
          {STATUS_LABEL[report.status]}
        </span>
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          ข้อความจากผู้แจ้ง
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">
          {report.message}
        </p>
        {report.evidenceUrl ? (
          <p className="mt-3 text-sm">
            <span className="text-[var(--ink-muted)]">หลักฐาน · </span>
            <a
              href={report.evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-medium text-[var(--accent-strong)] underline-offset-2 hover:underline"
            >
              {report.evidenceUrl}
            </a>
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--ink-faint)]">ไม่มีลิงก์หลักฐาน</p>
        )}
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--ink-muted)]">สมาชิก (ตอนส่ง)</dt>
            <dd className="mt-0.5 font-medium">{report.memberNameSnap}</dd>
          </div>
          <div>
            <dt className="text-[var(--ink-muted)]">ตัวละคร (ตอนส่ง)</dt>
            <dd className="mt-0.5 font-medium">{report.playerNameSnap}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
            {report.member.name}
          </h2>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              report.member.isLive
                ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "bg-[var(--surface-raised)] text-[var(--ink-muted)]"
            }`}
          >
            {report.member.isLive ? "อยู่ในแคลน" : "ไม่อยู่แล้ว"}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          อายุ {report.member.age} ปี
          {report.member.facebookUrl ? (
            <>
              {" · "}
              <a
                href={report.member.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
              >
                Facebook
              </a>
            </>
          ) : null}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-sm">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-4 py-3">
            <p className="text-xs text-[var(--ink-muted)]">ตัวละคร</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
              {report.member.playerCount}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-4 py-3">
            <p className="text-xs text-[var(--ink-muted)]">พฤติกรรม</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
              {report.member.behaviorCount}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-medium text-[var(--ink)]">
            ตัวละครของสมาชิก
          </h3>
          {report.member.players.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--ink-muted)]">ไม่มีตัวละคร</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {report.member.players.map((player) => (
                <li
                  key={player.id}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    player.id === report.playerId
                      ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "bg-[var(--surface-raised)] text-[var(--ink-muted)]"
                  }`}
                >
                  {player.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-medium text-[var(--ink)]">
            พฤติกรรมล่าสุด
          </h3>
          {report.member.recentBehaviors.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                title="ยังไม่มีพฤติกรรม"
                description="สมาชิกนี้ยังไม่มีบันทึกพฤติกรรม"
              />
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {report.member.recentBehaviors.map((behavior) => (
                <li
                  key={behavior.id}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-4 py-3 text-sm"
                >
                  <p className="line-clamp-2 text-[var(--ink)]">
                    {behavior.description}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ink-faint)]">
                    {behavior.player.name} ·{" "}
                    {new Date(behavior.createdAt).toLocaleString("th-TH")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {pending ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
            ตัดสินใจ
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            อนุมัติจะสร้างรายการพฤติกรรมจากข้อความนี้ · ยกเลิกจะเก็บเป็นประวัติเท่านั้น
          </p>
          <label className="mt-4 block text-sm">
            <span className="text-[var(--ink-muted)]">หมายเหตุ (ไม่บังคับ)</span>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="เช่น ตรวจสอบแล้ว / สแปม / ข้อมูลไม่พอ..."
              className="mt-1"
            />
          </label>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCancelOpen(true)}
              disabled={decideMutation.isPending}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={() => setApproveOpen(true)}
              disabled={decideMutation.isPending}
            >
              อนุมัติเป็นพฤติกรรม
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
            ผลการตัดสิน
          </h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--ink-muted)]">ผู้ตัดสิน</dt>
              <dd className="mt-0.5 font-medium">
                {report.decidedBy
                  ? displayHandle(report.decidedBy)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--ink-muted)]">เวลา</dt>
              <dd className="mt-0.5 font-medium">
                {report.decidedAt
                  ? new Date(report.decidedAt).toLocaleString("th-TH")
                  : "—"}
              </dd>
            </div>
          </dl>
          {report.decisionNote ? (
            <p className="mt-3 rounded-xl bg-[var(--surface-raised)] px-4 py-3 text-sm text-[var(--ink)]">
              {report.decisionNote}
            </p>
          ) : null}
          {report.behaviorId ? (
            <p className="mt-3 text-sm text-[var(--ink-muted)]">
              สร้างพฤติกรรมแล้ว · ดูได้ที่หน้า{" "}
              <Link
                href="/behaviors"
                className="font-medium text-[var(--accent-strong)] hover:underline"
              >
                พฤติกรรม
              </Link>
            </p>
          ) : null}
        </section>
      )}

      <ConfirmModal
        open={approveOpen}
        title="ยืนยันการอนุมัติ"
        description="จะสร้างบันทึกพฤติกรรมจากข้อความรายงานนี้ และเก็บประวัติการอนุมัติไว้"
        confirmLabel="อนุมัติ"
        pending={decideMutation.isPending}
        onClose={() => {
          if (!decideMutation.isPending) setApproveOpen(false);
        }}
        onConfirm={() => decideMutation.mutate("approved")}
      />
      <ConfirmModal
        open={cancelOpen}
        title="ยืนยันการยกเลิก"
        description="จะไม่สร้างพฤติกรรม แต่จะเก็บรายงานนี้เป็นประวัติที่ยกเลิกแล้ว"
        confirmLabel="ยืนยันยกเลิก"
        pending={decideMutation.isPending}
        onClose={() => {
          if (!decideMutation.isPending) setCancelOpen(false);
        }}
        onConfirm={() => decideMutation.mutate("cancelled")}
      />
    </div>
  );
}
