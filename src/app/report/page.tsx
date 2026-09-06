"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  REPORT_MESSAGE_MAX,
  REPORT_MESSAGE_MIN,
} from "@/lib/behavior-reports";
import { publicReportService } from "@/services/public-report.service";

export default function ReportPage() {
  const [playerId, setPlayerId] = useState("");
  const [message, setMessage] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const playersQuery = useQuery({
    queryKey: ["public-report", "players"],
    queryFn: publicReportService.listPlayers,
  });

  const createMutation = useMutation({
    mutationFn: publicReportService.create,
    onSuccess: () => {
      setConfirmOpen(false);
      setSubmitted(true);
      setError(null);
      setPlayerId("");
      setMessage("");
      setEvidenceUrl("");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const playerOptions = useMemo(
    () =>
      (playersQuery.data?.players ?? []).map((p) => ({
        value: p.id,
        label: p.name,
        keywords: p.name,
      })),
    [playersQuery.data?.players],
  );

  const selectedPlayerName =
    playersQuery.data?.players.find((p) => p.id === playerId)?.name ?? "";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createMutation.isPending || confirmOpen) return;
    const trimmed = message.trim();
    if (!playerId) {
      setError("เลือกตัวละคร");
      return;
    }
    if (
      trimmed.length < REPORT_MESSAGE_MIN ||
      trimmed.length > REPORT_MESSAGE_MAX
    ) {
      setError(
        `ข้อความต้องยาว ${REPORT_MESSAGE_MIN}–${REPORT_MESSAGE_MAX} ตัวอักษร`,
      );
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  function onConfirmSend() {
    if (createMutation.isPending) return;
    createMutation.mutate({
      playerId,
      message: message.trim(),
      evidenceUrl: evidenceUrl.trim() || null,
    });
  }

  if (submitted) {
    return (
      <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-panel)]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
          ส่งรายงานแล้ว
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          ขอบคุณที่แจ้งเข้ามา
        </p>
        <Button
          type="button"
          className="mt-6"
          onClick={() => setSubmitted(false)}
        >
          ส่งรายงานอีกครั้ง
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)] sm:p-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
        แจ้งพฤติกรรม
      </h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div>
          <Label htmlFor="report-player">1. ตัวละคร *</Label>
          {playersQuery.isLoading ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-[var(--ink-muted)]">
              <Spinner />
              กำลังโหลดตัวละคร...
            </div>
          ) : playersQuery.isError ? (
            <p className="mt-2 text-sm text-[var(--danger)]">
              โหลดตัวละครไม่สำเร็จ
            </p>
          ) : (
            <SearchableSelect
              id="report-player"
              value={playerId}
              onChange={setPlayerId}
              options={playerOptions}
              placeholder="เลือกตัวละคร"
              searchPlaceholder="ค้นหาชื่อตัวละคร..."
              emptyMessage="ไม่พบตัวละคร"
            />
          )}
        </div>

        <div>
          <Label htmlFor="report-message">2. รายละเอียดปัญหา *</Label>
          <Textarea
            id="report-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="อธิบายสิ่งที่พบ เช่น พฤติกรรมที่ไม่เหมาะสม..."
            className="mt-1"
            required
          />
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            {message.trim().length}/{REPORT_MESSAGE_MAX} ตัวอักษร (อย่างน้อย{" "}
            {REPORT_MESSAGE_MIN})
          </p>
        </div>

        <div>
          <Label htmlFor="report-evidence">3. แนบหลักฐาน (ไม่บังคับ)</Label>
          <Input
            id="report-evidence"
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://youtube.com/... หรือลิงก์คลิปอื่น"
            className="mt-1"
            inputMode="url"
            autoComplete="off"
          />
        </div>

        {error ? (
          <p
            className="rounded-xl border border-[var(--danger)]/30 bg-[color-mix(in_oklab,var(--danger)_14%,var(--surface))] px-3 py-2 text-sm text-[var(--danger)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={createMutation.isPending || confirmOpen}
          className="w-full"
        >
          ส่งรายงาน
        </Button>
      </form>

      <ConfirmModal
        open={confirmOpen}
        title="ยืนยันการส่งรายงาน"
        description={
          selectedPlayerName
            ? `ต้องการส่งรายงานเกี่ยวกับตัวละคร “${selectedPlayerName}” หรือไม่?`
            : "ต้องการส่งรายงานนี้หรือไม่?"
        }
        confirmLabel="ยืนยันส่ง"
        cancelLabel="ยกเลิก"
        confirmVariant="primary"
        pending={createMutation.isPending}
        onClose={() => {
          if (!createMutation.isPending) setConfirmOpen(false);
        }}
        onConfirm={onConfirmSend}
      />
    </div>
  );
}
