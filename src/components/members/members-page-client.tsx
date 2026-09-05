"use client";

import { useState } from "react";
import { MemberFormModal } from "@/components/members/member-form-modal";
import { MemberTable } from "@/components/members/member-table";
import { Button } from "@/components/ui/button";
import type { Member } from "@/types/member";

export function MembersPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(member: Member) {
    setEditing(member);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)]">
            สมาชิก
          </h1>
        </div>
        <Button type="button" onClick={openCreate} className="sm:min-w-40">
          + เพิ่มสมาชิก
        </Button>
      </div>

      <MemberTable onEdit={openEdit} />

      <MemberFormModal
        open={modalOpen}
        member={editing}
        onClose={closeModal}
      />
    </div>
  );
}
