"use client";

import { useState } from "react";
import { GroupFormModal } from "./group-form-modal";
import { GroupTable } from "./group-table";
import { Button } from "@/components/ui/button";
import type { Group } from "@/types/group";

export function GroupsPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [formKey, setFormKey] = useState(0);

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(item: Group) {
    setEditing(item);
    setFormKey((k) => k + 1);
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
            กลุ่ม
          </h1>
        </div>
        <Button type="button" onClick={openCreate} className="sm:min-w-40">
          + เพิ่มกลุ่ม
        </Button>
      </div>

      <GroupTable onEdit={openEdit} />

      <GroupFormModal
        key={formKey}
        open={modalOpen}
        item={editing}
        onClose={closeModal}
      />
    </div>
  );
}
