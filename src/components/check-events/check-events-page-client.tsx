"use client";

import { useState } from "react";
import { CheckEventFormModal } from "@/components/check-events/check-event-form-modal";
import { CheckEventTable } from "@/components/check-events/check-event-table";
import { Button } from "@/components/ui/button";
import type { CheckEvent } from "@/types/check-event";

export function CheckEventsPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CheckEvent | null>(null);
  const [formKey, setFormKey] = useState(0);

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(item: CheckEvent) {
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
            อีเวนต์เช็คชื่อ
          </h1>
        </div>
        <Button type="button" onClick={openCreate} className="sm:min-w-40">
          + สร้างอีเวนต์
        </Button>
      </div>

      <CheckEventTable onEdit={openEdit} />

      <CheckEventFormModal
        key={formKey}
        open={modalOpen}
        item={editing}
        onClose={closeModal}
      />
    </div>
  );
}
