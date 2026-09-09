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
import { DESCRIPTION_MAX } from "@/lib/field-limits";
import { EMPTY_ARRAY } from "@/lib/empty";
import { itemsService } from "@/services/items.service";
import { membersService } from "@/services/members.service";
import { safesService } from "@/services/safes.service";
import type { Safe } from "@/types/safe";

type SafeFormModalProps = {
  open: boolean;
  item?: Safe | null;
  onClose: () => void;
};

function toLocalInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function SafeFormModal({
  open,
  item = null,
  onClose,
}: SafeFormModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = Boolean(item);

  const [itemId, setItemId] = useState(item?.itemId ?? "");
  const [memberId, setMemberId] = useState(item?.memberId ?? "");
  const [quantity, setQuantity] = useState(
    item ? String(item.quantity) : "1",
  );
  const [description, setDescription] = useState(item?.description ?? "");
  const [depositItemAt, setDepositItemAt] = useState(
    toLocalInputValue(item?.depositItemAt) ||
      toLocalInputValue(new Date().toISOString()),
  );
  const [error, setError] = useState<string | null>(null);

  const itemsQuery = useQuery({
    queryKey: ["items", "options"],
    queryFn: () => itemsService.list({ page: 1, limit: 200 }),
    enabled: open,
  });

  const membersQuery = useQuery({
    queryKey: ["members", "options"],
    queryFn: () => membersService.list({ page: 1, limit: 200 }),
    enabled: open,
  });

  const items = itemsQuery.data?.data ?? EMPTY_ARRAY;
  const members = membersQuery.data?.data ?? EMPTY_ARRAY;

  const itemOptions = useMemo(
    () =>
      items.map((row) => ({
        value: row.id,
        label: row.name,
        keywords: row.name,
      })),
    [items],
  );

  const memberOptions = useMemo(
    () =>
      members.map((row) => ({
        value: row.id,
        label: row.name,
        keywords: row.name,
      })),
    [members],
  );

  const createMutation = useMutation({
    mutationFn: safesService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["safes"] });
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("บันทึกการฝากแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("บันทึกไม่สำเร็จ", err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      itemId: string;
      memberId: string;
      quantity: number;
      description: string | null;
      depositItemAt: string;
    }) => safesService.update(item!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["safes"] });
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("บันทึกการแก้ไขแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("แก้ไขไม่สำเร็จ", err.message);
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const qty = Number(quantity);
    if (!itemId) {
      setError("เลือกไอเท็ม");
      return;
    }
    if (!memberId) {
      setError("เลือกสมาชิก");
      return;
    }
    if (!Number.isInteger(qty) || qty < 1) {
      setError("จำนวนต้องเป็นจำนวนเต็มอย่างน้อย 1");
      return;
    }
    if (!depositItemAt) {
      setError("ระบุวันเวลาฝากไอเท็ม");
      return;
    }

    const payload = {
      itemId,
      memberId,
      quantity: qty,
      description: description.trim() || null,
      depositItemAt: new Date(depositItemAt).toISOString(),
    };

    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={pending}
      title={isEdit ? "แก้ไขบันทึกตู้เซฟ" : "ฝากไอเท็มเข้าตู้เซฟ"}
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
            form="safe-form"
            disabled={pending || itemsQuery.isLoading || membersQuery.isLoading}
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
              "บันทึก"
            )}
          </Button>
        </div>
      }
    >
      <form id="safe-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="safe-item">ไอเท็ม *</Label>
          {itemsQuery.isLoading ? (
            <div className="flex h-10 items-center gap-2 text-sm text-[var(--ink-muted)]">
              <Spinner />
              กำลังโหลดไอเท็ม...
            </div>
          ) : (
            <SearchableSelect
              id="safe-item"
              value={itemId}
              onChange={setItemId}
              options={itemOptions}
              placeholder="เลือกไอเท็ม"
              searchPlaceholder="ค้นหาไอเท็ม..."
              emptyMessage="ไม่พบไอเท็ม"
            />
          )}
        </div>

        <div>
          <Label htmlFor="safe-member">สมาชิก *</Label>
          {membersQuery.isLoading ? (
            <div className="flex h-10 items-center gap-2 text-sm text-[var(--ink-muted)]">
              <Spinner />
              กำลังโหลดสมาชิก...
            </div>
          ) : (
            <SearchableSelect
              id="safe-member"
              value={memberId}
              onChange={setMemberId}
              options={memberOptions}
              placeholder="เลือกสมาชิก"
              searchPlaceholder="ค้นหาสมาชิก..."
              emptyMessage="ไม่พบสมาชิก"
            />
          )}
        </div>

        <div>
          <Label htmlFor="safe-quantity">จำนวน *</Label>
          <Input
            id="safe-quantity"
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="safe-deposit">วันเวลาฝาก *</Label>
          <Input
            id="safe-deposit"
            type="datetime-local"
            value={depositItemAt}
            onChange={(e) => setDepositItemAt(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="safe-description">รายละเอียด</Label>
          <Textarea
            id="safe-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={DESCRIPTION_MAX}
            placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)"
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
