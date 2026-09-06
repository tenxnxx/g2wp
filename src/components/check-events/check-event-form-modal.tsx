"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { checkEventsService } from "@/services/check-events.service";
import { setDatesService } from "@/services/set-dates.service";
import { normalizeEventTitle } from "@/lib/check-events";
import type { CheckEvent } from "@/types/check-event";

type CheckEventFormModalProps = {
  open: boolean;
  item?: CheckEvent | null;
  onClose: () => void;
};

export function CheckEventFormModal({
  open,
  item = null,
  onClose,
}: CheckEventFormModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = Boolean(item);

  const [setDateId, setSetDateId] = useState(item?.setDateId ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [error, setError] = useState<string | null>(null);

  const datesQuery = useQuery({
    queryKey: ["set-dates", "options"],
    queryFn: () => setDatesService.list({ page: 1, limit: 200 }),
    enabled: open,
  });

  const dateOptions = useMemo(
    () =>
      (datesQuery.data?.data ?? []).map((row) => ({
        value: row.id,
        label: new Date(`${row.date}T00:00:00`).toLocaleDateString("th-TH"),
        keywords: row.date,
      })),
    [datesQuery.data?.data],
  );

  const createMutation = useMutation({
    mutationFn: checkEventsService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["check-events"] });
      await queryClient.invalidateQueries({ queryKey: ["set-dates"] });
      toast.success("สร้างอีเวนต์วันเช็คแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("สร้างอีเวนต์ไม่สำเร็จ", err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { setDateId: string; title: string | null }) =>
      checkEventsService.update(item!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["check-events"] });
      toast.success("บันทึกอีเวนต์แล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("แก้ไขอีเวนต์ไม่สำเร็จ", err.message);
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setDateId) {
      setError("กรุณาเลือกวันเช็ค");
      return;
    }
    const payload = {
      setDateId,
      title: normalizeEventTitle(title),
    };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={pending}
      title={isEdit ? "แก้ไขอีเวนต์วันเช็ค" : "สร้างอีเวนต์วันเช็ค"}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            form="check-event-form"
            disabled={pending || datesQuery.isLoading}
            className="w-full sm:w-auto sm:min-w-36"
          >
            {pending ? (
              <>
                <Spinner />
                กำลังบันทึก...
              </>
            ) : isEdit ? (
              "บันทึกการแก้ไข"
            ) : (
              "สร้างอีเวนต์"
            )}
          </Button>
        </div>
      }
    >
      <form id="check-event-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="check-event-date">วันเช็ค *</Label>
          {datesQuery.isLoading ? (
            <div className="flex h-10 items-center gap-2 text-sm text-[var(--ink-muted)]">
              <Spinner />
              กำลังโหลดวันเช็ค...
            </div>
          ) : dateOptions.length === 0 ? (
            <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--ink-muted)]">
              ยังไม่มีวันเช็ค — ไปเพิ่มที่เมนูกำหนดวันเช็คก่อน
            </p>
          ) : (
            <SearchableSelect
              id="check-event-date"
              value={setDateId}
              onChange={setSetDateId}
              options={dateOptions}
              placeholder="เลือกวันเช็ค"
              searchPlaceholder="ค้นหาวัน..."
              emptyMessage="ไม่พบวันเช็ค"
            />
          )}
        </div>

        <div>
          <Label htmlFor="check-event-title">ชื่ออีเวนต์</Label>
          <Input
            id="check-event-title"
            name="eventTitle"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={title}
            onChange={(e) => {
              const thaiDigits = "๐๑๒๓๔๕๖๗๘๙";
              const next = e.target.value.replace(/[๐-๙]/g, (ch) =>
                String(thaiDigits.indexOf(ch)),
              );
              setTitle(next);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="เช่น เช็ครอบที่ 1"
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
      </form>
    </Modal>
  );
}
