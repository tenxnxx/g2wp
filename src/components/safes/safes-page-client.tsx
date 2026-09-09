"use client";

import { useState } from "react";
import { SafeFormModal } from "./safe-form-modal";
import { SafeTable } from "./safe-table";
import { Button } from "@/components/ui/button";
import type { Safe } from "@/types/safe";

export function SafesPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Safe | null>(null);
  const [formKey, setFormKey] = useState(0);

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(item: Safe) {
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
            ตู้เซฟ
          </h1>
        </div>
        <Button type="button" onClick={openCreate} className="sm:min-w-40">
          + ฝากไอเท็ม
        </Button>
      </div>

      <SafeTable onEdit={openEdit} />

      <SafeFormModal
        key={formKey}
        open={modalOpen}
        item={editing}
        onClose={closeModal}
      />
    </div>
  );
}
