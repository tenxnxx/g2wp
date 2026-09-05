"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { setDatesService } from "@/services/set-dates.service";
import type { SetDate } from "@/types/set-date";

type SetDateFormModalProps = {
  open: boolean;
  item?: SetDate | null;
  onClose: () => void;
};

export function SetDateFormModal({
  open,
  item = null,
  onClose,
}: SetDateFormModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = Boolean(item);

  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(item?.date ?? "");
    setError(null);
  }, [open, item]);

  const createMutation = useMutation({
    mutationFn: setDatesService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["set-dates"] });
      toast.success("เพิ่มวันที่แล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("เพิ่มวันที่ไม่สำเร็จ", err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { date: string }) =>
      setDatesService.update(item!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["set-dates"] });
      toast.success("บันทึกวันที่แล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("แก้ไขวันที่ไม่สำเร็จ", err.message);
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date.trim()) {
      setError("กรุณาเลือกวันที่");
      return;
    }

    const payload = { date: date.trim() };
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
      title={isEdit ? "แก้ไขวันเช็ค" : "เพิ่มวันเช็ค"}
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
            form="set-date-form"
            disabled={pending}
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
              "เพิ่มวันเช็ค"
            )}
          </Button>
        </div>
      }
    >
      <form id="set-date-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="set-date-value">วันที่ *</Label>
          <Input
            id="set-date-value"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
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
