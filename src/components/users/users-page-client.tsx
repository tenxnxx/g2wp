"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { UseStatus } from "@/components/catalog/use-status";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { membersService } from "@/services/members.service";
import { usersService } from "@/services/users.service";
import {
  APP_USER_ROLES,
  type AppUser,
  type AppUserRole,
} from "@/types/app-user";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

const ROLE_LABEL: Record<AppUserRole, string> = {
  admin: "แอดมิน",
  user: "ผู้ใช้",
};

const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60";

function formatSeen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function UsersPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [formKey, setFormKey] = useState(0);

  function openCreate() {
    setEditing(null);
    setFormKey((key) => key + 1);
    setModalOpen(true);
  }

  function openEdit(item: AppUser) {
    setEditing(item);
    setFormKey((key) => key + 1);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)]">
            ผู้ใช้
          </h1>
          <p className="max-w-2xl text-sm text-[var(--ink-muted)]">
            เพิ่มผู้ใช้แล้วกำหนดบทบาทได้ที่นี่ อีเมลใน ADMIN_EMAILS เป็นแอดมินถาวร
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="sm:min-w-40">
          + เพิ่มผู้ใช้
        </Button>
      </div>
      <UserTable onEdit={openEdit} />
      <UserFormModal
        key={formKey}
        open={modalOpen}
        item={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function UserTable({ onEdit }: { onEdit: (item: AppUser) => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const listQuery = useQuery({
    queryKey: ["users", page, DEFAULT_PAGE_SIZE, search],
    queryFn: () =>
      usersService.list({ page, limit: DEFAULT_PAGE_SIZE, q: search }),
    placeholderData: (previous) => previous,
  });

  const meta = listQuery.data?.meta;
  const items = listQuery.data?.data ?? [];

  if (meta && page > meta.totalPages) {
    setPage(meta.totalPages);
  }

  async function handleRefresh() {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    toast.success("รีเฟรชแล้ว");
  }

  if (listQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 px-1 py-10 text-sm text-[var(--ink-muted)]">
        <Spinner />
        กำลังโหลดผู้ใช้...
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="rounded-2xl border border-[var(--danger)]/30 bg-[color-mix(in_oklab,var(--danger)_10%,var(--surface))] px-5 py-4 text-sm text-[var(--danger)]">
        โหลดข้อมูลไม่สำเร็จ: {(listQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          รายการผู้ใช้
        </h2>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหาอีเมล..."
            className="sm:w-56"
            aria-label="ค้นหาอีเมล"
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
        <EmptyState
          title="ยังไม่มีผู้ใช้"
          description="กดเพิ่มผู้ใช้เพื่อสร้างบัญชีและกำหนดบทบาท"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-raised)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">อีเมล</th>
                  <th className="px-5 py-3 font-semibold">สมาชิก</th>
                  <th className="px-5 py-3 font-semibold">บทบาท</th>
                  <th className="px-5 py-3 font-semibold">สถานะ</th>
                  <th className="px-5 py-3 font-semibold">เข้าใช้ล่าสุด</th>
                  <th className="px-5 py-3 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="border-t border-[var(--line)] transition hover:bg-[var(--surface-hover)]"
                    >
                      <td className="px-5 py-3 font-medium text-[var(--ink)]">
                        {item.email}
                      </td>
                      <td className="px-5 py-3 text-[var(--ink)]">
                        {item.memberName ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-[var(--ink)]">
                        {ROLE_LABEL[item.role]}
                      </td>
                      <td className="px-5 py-3">
                        <UseStatus isUse={item.isUse} />
                      </td>
                      <td className="px-5 py-3 text-[var(--ink-muted)]">
                        {formatSeen(item.lastSeenAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-8 px-3 text-xs"
                            onClick={() => onEdit(item)}
                          >
                            แก้ไข
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
    </div>
  );
}

function UserFormModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: AppUser | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = Boolean(item);
  const roleLocked = Boolean(item?.lockedByAllowlist || item?.isSelf);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppUserRole>(item?.role ?? "user");
  const [isUse, setIsUse] = useState(item?.isUse ?? true);
  const [memberId, setMemberId] = useState(item?.memberId ?? "");
  const [error, setError] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: ["members", "user-link"],
    queryFn: () => membersService.list({ page: 1, limit: 200 }),
    enabled: open,
  });

  const memberOptions = membersQuery.data?.data ?? [];
  const selectedMissing =
    memberId !== "" && !memberOptions.some((member) => member.id === memberId);

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("เพิ่มผู้ใช้แล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("เพิ่มผู้ใช้ไม่สำเร็จ", err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      role: AppUserRole;
      isUse: boolean;
      memberId: string | null;
    }) => {
      if (!item) throw new Error("ไม่พบผู้ใช้");
      return usersService.update(item.id, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("บันทึกผู้ใช้แล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("บันทึกไม่สำเร็จ", err.message);
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { role, isUse, memberId: memberId || null };
    if (isEdit) {
      updateMutation.mutate(payload);
      return;
    }
    if (!email.trim() || password.length < 6) {
      setError("กรอกอีเมล และรหัสผ่านอย่างน้อย 6 ตัวอักษร");
      return;
    }
    createMutation.mutate({
      email: email.trim(),
      password,
      ...payload,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={pending}
      title={isEdit ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้"}
      description={item?.email}
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
            form="user-form"
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
              "เพิ่มผู้ใช้"
            )}
          </Button>
        </div>
      }
    >
      <form id="user-form" onSubmit={onSubmit} className="space-y-4">
        {isEdit ? null : (
          <>
            <div>
              <Label htmlFor="user-email">อีเมล</Label>
              <Input
                id="user-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="user-password">รหัสผ่าน</Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                required
                minLength={6}
              />
            </div>
          </>
        )}
        <div>
          <Label htmlFor="user-role">บทบาท</Label>
          <select
            id="user-role"
            value={role}
            disabled={roleLocked}
            onChange={(event) => setRole(event.target.value as AppUserRole)}
            className={SELECT_CLASS}
          >
            {APP_USER_ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="user-member">สมาชิก</Label>
          <select
            id="user-member"
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">ไม่ผูกสมาชิก</option>
            {selectedMissing && item?.memberName ? (
              <option value={memberId}>{item.memberName}</option>
            ) : null}
            {memberOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <label
          htmlFor="user-isuse"
          className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-4 py-3"
        >
          <span>
            <span className="block text-sm font-medium text-[var(--ink)]">
              ใช้งาน
            </span>
            <span className="text-xs text-[var(--ink-muted)]">
              {isUse
                ? "เข้าสู่ระบบและใช้งานได้"
                : "ถูกปฏิเสธทันทีที่เข้าสู่ระบบ"}
            </span>
          </span>
          <input
            id="user-isuse"
            type="checkbox"
            checked={isUse}
            onChange={(event) => setIsUse(event.target.checked)}
            disabled={roleLocked}
            className="size-4 accent-[var(--accent)]"
          />
        </label>
        {roleLocked ? (
          <p className="text-xs text-[var(--ink-muted)]">
            {item?.lockedByAllowlist
              ? "บัญชีใน ADMIN_EMAILS เป็นแอดมินถาวร เปลี่ยนบทบาทหรือปิดใช้งานไม่ได้"
              : "เปลี่ยนบทบาทหรือปิดบัญชีตัวเองไม่ได้"}
          </p>
        ) : null}
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
