"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { UseStatus } from "@/components/catalog/use-status";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { NAME_MAX } from "@/lib/field-limits";
import type { PaginatedResult } from "@/types/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

type NameUseRow = {
  id: string;
  name: string;
  isUse: boolean;
  bossCount?: number;
};

type NameUseService = {
  list: (params: {
    page?: number;
    limit?: number;
    q?: string;
  }) => Promise<PaginatedResult<NameUseRow>>;
  create: (input: { name: string; isUse: boolean }) => Promise<NameUseRow>;
  update: (
    id: string,
    input: { name: string; isUse: boolean },
  ) => Promise<NameUseRow>;
  remove: (id: string) => Promise<void>;
};

type NameUseManagerProps = {
  title: string;
  addLabel: string;
  listTitle: string;
  nameLabel: string;
  namePlaceholder: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  queryKey: string;
  service: NameUseService;
};

export function NameUseManager({
  title,
  addLabel,
  listTitle,
  nameLabel,
  namePlaceholder,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  queryKey,
  service,
}: NameUseManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NameUseRow | null>(null);
  const [formKey, setFormKey] = useState(0);

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(item: NameUseRow) {
    setEditing(item);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        <Button type="button" onClick={openCreate} className="sm:min-w-40">
          + {addLabel}
        </Button>
      </div>

      <NameUseTable
        listTitle={listTitle}
        searchPlaceholder={searchPlaceholder}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        queryKey={queryKey}
        service={service}
        onEdit={openEdit}
      />

      <NameUseFormModal
        key={formKey}
        open={modalOpen}
        item={editing}
        title={editing ? `แก้ไข${title}` : addLabel}
        nameLabel={nameLabel}
        namePlaceholder={namePlaceholder}
        queryKey={queryKey}
        service={service}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function NameUseTable({
  listTitle,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  queryKey,
  service,
  onEdit,
}: {
  listTitle: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  queryKey: string;
  service: NameUseService;
  onEdit: (item: NameUseRow) => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NameUseRow | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const listQuery = useQuery({
    queryKey: [queryKey, page, DEFAULT_PAGE_SIZE, search],
    queryFn: () =>
      service.list({ page, limit: DEFAULT_PAGE_SIZE, q: search }),
    placeholderData: (previous) => previous,
  });

  const meta = listQuery.data?.meta;
  const items = listQuery.data?.data ?? [];

  if (meta && page > meta.totalPages) {
    setPage(meta.totalPages);
  }

  const deleteMutation = useMutation({
    mutationFn: service.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
      await queryClient.invalidateQueries({ queryKey: ["bosses"] });
      setDeleteTarget(null);
      toast.success(`ลบ${listTitle.replace("รายการ", "")}แล้ว`);
    },
    onError: (err: Error) => {
      toast.error("ลบไม่สำเร็จ", err.message);
    },
  });

  async function handleRefresh() {
    const result = await listQuery.refetch();
    if (result.isError) {
      toast.error("รีเฟรชไม่สำเร็จ", (result.error as Error).message);
      return;
    }
    toast.success("รีเฟรชข้อมูลแล้ว");
  }

  if (listQuery.isLoading && !listQuery.data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-muted)]">
        <Spinner />
        กำลังโหลด...
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--surface)] p-6 text-sm text-[var(--danger)]">
        โหลดข้อมูลไม่สำเร็จ: {(listQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          {listTitle}
        </h2>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            className="sm:w-56"
            aria-label={searchPlaceholder}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleRefresh()}
            disabled={listQuery.isFetching}
          >
            {listQuery.isFetching ? <Spinner /> : null}
            รีเฟรช
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-raised)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">ชื่อ</th>
                  <th className="px-5 py-3 font-semibold">สถานะ</th>
                  <th className="px-5 py-3 font-semibold">บอส</th>
                  <th className="px-5 py-3 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-[var(--line)] transition hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-5 py-3 font-medium text-[var(--ink)]">
                      {item.name}
                    </td>
                    <td className="px-5 py-3">
                      <UseStatus isUse={item.isUse} />
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-muted)]">
                      {item.bossCount ?? 0}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          onClick={() => onEdit(item)}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="h-8 px-3 text-xs"
                          disabled={deleteMutation.isPending}
                          onClick={() => setDeleteTarget(item)}
                        >
                          ลบ
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta ? (
            <div className="border-t border-[var(--line)] px-5 py-4">
              <Pagination meta={meta} onPageChange={setPage} />
            </div>
          ) : null}
        </>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={`ยืนยันการลบ`}
        description={
          deleteTarget
            ? `ต้องการลบ “${deleteTarget.name}” หรือไม่? ถ้ามีบอสผูกอยู่จะลบไม่ได้`
            : ""
        }
        pending={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

function NameUseFormModal({
  open,
  item,
  title,
  nameLabel,
  namePlaceholder,
  queryKey,
  service,
  onClose,
}: {
  open: boolean;
  item: NameUseRow | null;
  title: string;
  nameLabel: string;
  namePlaceholder: string;
  queryKey: string;
  service: NameUseService;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = Boolean(item);
  const [name, setName] = useState(item?.name ?? "");
  const [isUse, setIsUse] = useState(item?.isUse ?? true);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: service.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("บันทึกแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("บันทึกไม่สำเร็จ", err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { name: string; isUse: boolean }) =>
      service.update(item!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
      await queryClient.invalidateQueries({ queryKey: ["bosses"] });
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
    if (!name.trim()) {
      setError(`กรอก${nameLabel}`);
      return;
    }
    const payload = { name: name.trim(), isUse };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={pending}
      title={title}
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
            form={`${queryKey}-form`}
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
              "บันทึก"
            )}
          </Button>
        </div>
      }
    >
      <form id={`${queryKey}-form`} onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor={`${queryKey}-name`}>{nameLabel} *</Label>
          <Input
            id={`${queryKey}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={namePlaceholder}
            autoFocus
            required
            maxLength={NAME_MAX}
          />
        </div>
        <label
          htmlFor={`${queryKey}-isuse`}
          className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-4 py-3"
        >
          <span>
            <span className="block text-sm font-medium text-[var(--ink)]">
              ใช้งาน
            </span>
            <span className="text-xs text-[var(--ink-muted)]">
              {isUse
                ? "แสดงในตัวเลือกตอนเพิ่มบอส"
                : "ซ่อนจากตัวเลือกใหม่ บอสเดิมยังอ้างอิงได้"}
            </span>
          </span>
          <input
            id={`${queryKey}-isuse`}
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
