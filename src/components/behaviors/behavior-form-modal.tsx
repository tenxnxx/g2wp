"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/context/toast-context";
import { EMPTY_ARRAY } from "@/lib/empty";
import { behaviorsService } from "@/services/behaviors.service";
import { membersService } from "@/services/members.service";
import { playersService } from "@/services/players.service";
import type { Behavior } from "@/types/behavior";

type BehaviorFormModalProps = {
  open: boolean;
  behavior?: Behavior | null;
  onClose: () => void;
};

export function BehaviorFormModal({
  open,
  behavior = null,
  onClose,
}: BehaviorFormModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = Boolean(behavior);

  const [description, setDescription] = useState(behavior?.description ?? "");
  const [evidenceUrl, setEvidenceUrl] = useState(behavior?.evidenceUrl ?? "");
  const [memberId, setMemberId] = useState(behavior?.memberId ?? "");
  const [playerId, setPlayerId] = useState(behavior?.playerId ?? "");
  const [error, setError] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: ["members", "options"],
    queryFn: () => membersService.list({ page: 1, limit: 200 }),
    enabled: open,
  });

  const playersQuery = useQuery({
    queryKey: ["players", "options", memberId],
    queryFn: () =>
      playersService.list({ page: 1, limit: 200, memberId }),
    enabled: open && Boolean(memberId),
  });

  const createMutation = useMutation({
    mutationFn: behaviorsService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["behaviors"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("เพิ่มพฤติกรรมแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("เพิ่มพฤติกรรมไม่สำเร็จ", err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      description: string;
      evidenceUrl: string | null;
      memberId: string;
      playerId: string;
    }) => behaviorsService.update(behavior!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["behaviors"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("บันทึกการแก้ไขพฤติกรรมแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("แก้ไขพฤติกรรมไม่สำเร็จ", err.message);
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;
  const members = membersQuery.data?.data ?? EMPTY_ARRAY;
  const players = playersQuery.data?.data ?? EMPTY_ARRAY;
  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        value: member.id,
        label: member.name,
        keywords: member.name,
      })),
    [members],
  );
  const playerOptions = useMemo(
    () =>
      players.map((player) => ({
        value: player.id,
        label: player.name,
        keywords: player.name,
      })),
    [players],
  );

  function onMemberChange(next: string) {
    setMemberId(next);
    setPlayerId("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!description.trim() || !memberId || !playerId) {
      setError("กรอกรายละเอียด และเลือกสมาชิกกับตัวละคร");
      return;
    }

    const payload = {
      description: description.trim(),
      evidenceUrl: evidenceUrl.trim() || null,
      memberId,
      playerId,
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
      title={isEdit ? "แก้ไขพฤติกรรม" : "เพิ่มพฤติกรรม"}
      description={
        isEdit
          ? "อัปเดตรายละเอียดและความสัมพันธ์ของพฤติกรรม"
          : "บันทึกพฤติกรรมโดยผูกกับสมาชิกและตัวละคร"
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
            form="behavior-form"
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
              "เพิ่มพฤติกรรม"
            )}
          </Button>
        </div>
      }
    >
      <form id="behavior-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="behavior-description">รายละเอียด *</Label>
          <Textarea
            id="behavior-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="อธิบายพฤติกรรม..."
            autoFocus
            required
          />
        </div>

        <div>
          <Label htmlFor="behavior-evidence">แนบหลักฐาน (ไม่บังคับ)</Label>
          <Input
            id="behavior-evidence"
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://youtube.com/... หรือลิงก์คลิปอื่น"
            inputMode="url"
            autoComplete="off"
          />
        </div>

        <div>
          <Label htmlFor="behavior-member">สมาชิก *</Label>
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
              id="behavior-member"
              value={memberId}
              onChange={onMemberChange}
              options={memberOptions}
              placeholder="เลือกสมาชิก"
              searchPlaceholder="ค้นหาด้วยชื่อสมาชิก..."
              emptyMessage="ไม่พบสมาชิกที่ตรงกับคำค้น"
            />
          )}
        </div>

        <div>
          <Label htmlFor="behavior-player">ตัวละคร *</Label>
          {!memberId ? (
            <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--ink-muted)]">
              เลือกสมาชิกก่อนเพื่อโหลดรายชื่อตัวละคร
            </p>
          ) : playersQuery.isLoading ? (
            <div className="flex h-10 items-center gap-2 text-sm text-[var(--ink-muted)]">
              <Spinner />
              กำลังโหลดตัวละคร...
            </div>
          ) : players.length === 0 ? (
            <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--ink-muted)]">
              สมาชิกนี้ยังไม่มีตัวละคร — ไปเพิ่มที่เมนูตัวละครก่อน
            </p>
          ) : (
            <SearchableSelect
              id="behavior-player"
              value={playerId}
              onChange={setPlayerId}
              options={playerOptions}
              placeholder="เลือกตัวละคร"
              searchPlaceholder="ค้นหาด้วยชื่อตัวละคร..."
              emptyMessage="ไม่พบตัวละครที่ตรงกับคำค้น"
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
