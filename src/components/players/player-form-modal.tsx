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
import { EMPTY_ARRAY } from "@/lib/empty";
import { membersService } from "@/services/members.service";
import { playersService } from "@/services/players.service";
import type { Player } from "@/types/player";

type PlayerFormModalProps = {
  open: boolean;
  player?: Player | null;
  onClose: () => void;
};

export function PlayerFormModal({
  open,
  player = null,
  onClose,
}: PlayerFormModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = Boolean(player);

  const [name, setName] = useState(player?.name ?? "");
  const [memberId, setMemberId] = useState(player?.memberId ?? "");
  const [error, setError] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: ["members", "options"],
    queryFn: () => membersService.list({ page: 1, limit: 200 }),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: playersService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["players"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["members", "options"] });
      toast.success("เพิ่มตัวละครแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("เพิ่มตัวละครไม่สำเร็จ", err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { name: string; memberId: string }) =>
      playersService.update(player!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["players"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["members", "options"] });
      toast.success("บันทึกการแก้ไขตัวละครแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("แก้ไขตัวละครไม่สำเร็จ", err.message);
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;
  const members = membersQuery.data?.data ?? EMPTY_ARRAY;
  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        value: member.id,
        label: member.name,
        keywords: member.name,
      })),
    [members],
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !memberId) {
      setError("กรอกชื่อและเลือกสมาชิก");
      return;
    }

    const payload = { name: name.trim(), memberId };

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
      title={isEdit ? "แก้ไขตัวละคร" : "เพิ่มตัวละคร"}
      description={
        isEdit
          ? "อัปเดตชื่อและสมาชิกที่ผูกกับตัวละคร"
          : "สร้างตัวละครใหม่และเลือกสมาชิกเจ้าของ"
      }
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
            form="player-form"
            disabled={pending || membersQuery.isLoading}
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
              "เพิ่มตัวละคร"
            )}
          </Button>
        </div>
      }
    >
      <form id="player-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="player-name">ชื่อตัวละคร *</Label>
          <Input
            id="player-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น PlayerOne"
            autoFocus
            required
          />
        </div>

        <div>
          <Label htmlFor="player-member">สมาชิก *</Label>
          {membersQuery.isLoading ? (
            <div className="flex h-10 items-center gap-2 text-sm text-[var(--ink-muted)]">
              <Spinner />
              กำลังโหลดสมาชิก...
            </div>
          ) : members.length === 0 ? (
            <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--ink-muted)]">
              ยังไม่มีสมาชิก — ไปเพิ่มที่เมนูสมาชิกก่อน
            </p>
          ) : (
            <SearchableSelect
              id="player-member"
              value={memberId}
              onChange={setMemberId}
              options={memberOptions}
              placeholder="เลือกสมาชิก"
              searchPlaceholder="ค้นหาด้วยชื่อสมาชิก..."
              emptyMessage="ไม่พบสมาชิกที่ตรงกับคำค้น"
            />
          )}
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
