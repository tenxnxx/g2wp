"use client";

import { useState } from "react";
import { SetDateFormModal } from "@/components/set-dates/set-date-form-modal";
import { SetDateTable } from "@/components/set-dates/set-date-table";
import { Button } from "@/components/ui/button";
import type { SetDate } from "@/types/set-date";

export function SetDatesPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SetDate | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item: SetDate) {
    setEditing(item);
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
            กำหนดวันเช็ค
          </h1>
        </div>
        <Button type="button" onClick={openCreate} className="sm:min-w-40">
          + เพิ่มวันเช็ค
        </Button>
      </div>

      <SetDateTable onEdit={openEdit} />

      <SetDateFormModal
        open={modalOpen}
        item={editing}
        onClose={closeModal}
      />
    </div>
  );
}
