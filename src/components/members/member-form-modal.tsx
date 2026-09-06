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
import { groupsService } from "@/services/groups.service";
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

  const [name, setName] = useState(member?.name ?? "");
  const [age, setAge] = useState(member ? String(member.age) : "");
  const [facebookUrl, setFacebookUrl] = useState(member?.facebookUrl ?? "");
  const [isLive, setIsLive] = useState(member?.isLive ?? true);
  const [groupId, setGroupId] = useState(member?.groupId ?? "");
  const [error, setError] = useState<string | null>(null);

  const groupsQuery = useQuery({
    queryKey: ["groups", "options", "isUse", open, member?.groupId],
    queryFn: () => groupsService.list({ page: 1, limit: 200, isUse: true }),
    enabled: open,
  });

  const groupRows = groupsQuery.data?.data ?? EMPTY_ARRAY;
  const groupOptions = useMemo(() => {
    const options = [
      { value: "", label: "ไม่ระบุกลุ่ม" },
      ...groupRows.map((g) => ({
        value: g.id,
        label: g.groupName,
        keywords: g.groupName,
      })),
    ];
    if (
      member?.groupId &&
      member.groupName &&
      !options.some((o) => o.value === member.groupId)
    ) {
      return [
        options[0],
        {
          value: member.groupId,
          label: `${member.groupName} (ปิดใช้งาน)`,
          keywords: member.groupName,
        },
        ...options.slice(1),
      ];
    }
    return options;
  }, [groupRows, member]);

  const createMutation = useMutation({
    mutationFn: membersService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
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
      groupId: string | null;
    }) => membersService.update(member!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
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
    if (!name.trim()) {
      setError("กรอกชื่อสมาชิก");
      return;
    }
    if (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      setError("อายุต้องเป็นจำนวนเต็มระหว่าง 0–150 ปี");
      return;
    }

    const payload = {
      name: name.trim(),
      age: parsedAge,
      facebookUrl: facebookUrl.trim() || null,
      isLive,
      groupId: groupId.trim() || null,
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
            max={150}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="เช่น 25 (สูงสุด 150)"
            required
          />
        </div>

        <div>
          <Label htmlFor="member-group">กลุ่ม</Label>
          {groupsQuery.isLoading ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-[var(--ink-muted)]">
              <Spinner />
              กำลังโหลดกลุ่ม...
            </div>
          ) : (
            <SearchableSelect
              id="member-group"
              value={groupId}
              onChange={setGroupId}
              options={groupOptions}
              placeholder="เลือกกลุ่ม"
              searchPlaceholder="ค้นหาชื่อกลุ่ม..."
              emptyMessage="ไม่พบกลุ่ม"
            />
          )}
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
