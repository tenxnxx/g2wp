"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { membersService } from "@/services/members.service";
import type { Member } from "@/types/member";

type MemberFormModalProps = {
  open: boolean;
  member?: Member | null;
  onClose: () => void;
};

export function MemberFormModal({
  open,
  member = null,
  onClose,
}: MemberFormModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = Boolean(member);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [isLive, setIsLive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(member?.name ?? "");
    setAge(member ? String(member.age) : "");
    setFacebookUrl(member?.facebookUrl ?? "");
    setIsLive(member?.isLive ?? true);
    setError(null);
  }, [open, member]);

  const createMutation = useMutation({
    mutationFn: membersService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("เพิ่มสมาชิกแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("เพิ่มสมาชิกไม่สำเร็จ", err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      name: string;
      age: number;
      facebookUrl: string | null;
      isLive: boolean;
    }) => membersService.update(member!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("บันทึกการแก้ไขสมาชิกแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("แก้ไขสมาชิกไม่สำเร็จ", err.message);
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAge = Number(age);
    if (!name.trim() || !Number.isInteger(parsedAge) || parsedAge < 0) {
      setError("กรอกชื่อและอายุให้ถูกต้อง");
      return;
    }

    const payload = {
      name: name.trim(),
      age: parsedAge,
      facebookUrl: facebookUrl.trim() || null,
      isLive,
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
      title={isEdit ? "แก้ไขสมาชิก" : "เพิ่มสมาชิก"}
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
            form="member-form"
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
              "เพิ่มสมาชิก"
            )}
          </Button>
        </div>
      }
    >
      <form id="member-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="member-name">ชื่อ *</Label>
          <Input
            id="member-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อสมาชิก"
            autoFocus
            required
          />
        </div>

        <div>
          <Label htmlFor="member-age">อายุ *</Label>
          <Input
            id="member-age"
            type="number"
            min={0}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="เช่น 25"
            required
          />
        </div>

        <div>
          <Label htmlFor="member-facebook">Facebook URL</Label>
          <Input
            id="member-facebook"
            type="url"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/..."
          />
        </div>

        <label
          htmlFor="member-islive"
          className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-4 py-3"
        >
          <span>
            <span className="block text-sm font-medium text-[var(--ink)]">
              สถานะอยู่
            </span>
            <span className="text-xs text-[var(--ink-muted)]">
              {isLive ? "อยู่ในแคลน" : "ไม่อยู่แล้ว"}
            </span>
          </span>
          <input
            id="member-islive"
            type="checkbox"
            checked={isLive}
            onChange={(e) => setIsLive(e.target.checked)}
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
