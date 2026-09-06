"use client";

import { useState } from "react";
import { BehaviorFormModal } from "@/components/behaviors/behavior-form-modal";
import { BehaviorTable } from "@/components/behaviors/behavior-table";
import { Button } from "@/components/ui/button";
import type { Behavior } from "@/types/behavior";

export function BehaviorsPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Behavior | null>(null);
  const [formKey, setFormKey] = useState(0);

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(behavior: Behavior) {
    setEditing(behavior);
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
            พฤติกรรม
          </h1>
        </div>
        <Button type="button" onClick={openCreate} className="sm:min-w-40">
          + เพิ่มพฤติกรรม
        </Button>
      </div>

      <BehaviorTable onEdit={openEdit} />

      <BehaviorFormModal
        key={formKey}
        open={modalOpen}
        behavior={editing}
        onClose={closeModal}
      />
    </div>
  );
}
