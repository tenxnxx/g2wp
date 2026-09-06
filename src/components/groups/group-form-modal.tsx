"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { groupsService } from "@/services/groups.service";
import type { Group } from "@/types/group";

type GroupFormModalProps = {
  open: boolean;
  item?: Group | null;
  onClose: () => void;
};

export function GroupFormModal({
  open,
  item = null,
  onClose,
}: GroupFormModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = Boolean(item);

  const [groupName, setGroupName] = useState(item?.groupName ?? "");
  const [isUse, setIsUse] = useState(item?.isUse ?? true);
  const [error, setError] = useState<string | null>(null);
  const createMutation = useMutation({
    mutationFn: groupsService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("เพิ่มกลุ่มแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("เพิ่มกลุ่มไม่สำเร็จ", err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { groupName: string; isUse: boolean }) =>
      groupsService.update(item!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("บันทึกกลุ่มแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("แก้ไขกลุ่มไม่สำเร็จ", err.message);
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupName.trim()) {
      setError("กรอกชื่อกลุ่ม");
      return;
    }

    const payload = {
      groupName: groupName.trim(),
      isUse,
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
      title={isEdit ? "แก้ไขกลุ่ม" : "เพิ่มกลุ่ม"}
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
            form="group-form"
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
              "เพิ่มกลุ่ม"
            )}
          </Button>
        </div>
      }
    >
      <form id="group-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="group-name">ชื่อกลุ่ม *</Label>
          <Input
            id="group-name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="เช่น G1, Elite, New"
            autoFocus
            required
            maxLength={100}
          />
        </div>

        <label
          htmlFor="group-isuse"
          className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-4 py-3"
        >
          <span>
            <span className="block text-sm font-medium text-[var(--ink)]">
              ใช้งาน
            </span>
            <span className="text-xs text-[var(--ink-muted)]">
              {isUse
                ? "แสดงในตัวเลือกตอนเพิ่มสมาชิก"
                : "ซ่อนจากตัวเลือก (สมาชิกเดิมยังเก็บกลุ่มไว้ได้)"}
            </span>
          </span>
          <input
            id="group-isuse"
            type="checkbox"
            checked={isUse}
            onChange={(e) => setIsUse(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
        </label>

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
