"use client";

import { useState } from "react";
import { ItemFormModal } from "./item-form-modal";
import { ItemTable } from "./item-table";
import { Button } from "@/components/ui/button";
import type { Item } from "@/types/item";

export function ItemsPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [formKey, setFormKey] = useState(0);

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(item: Item) {
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
            ไอเท็ม
          </h1>
        </div>
        <Button type="button" onClick={openCreate} className="sm:min-w-40">
          + เพิ่มไอเท็ม
        </Button>
      </div>

      <ItemTable onEdit={openEdit} />

      <ItemFormModal
        key={formKey}
        open={modalOpen}
        item={editing}
        onClose={closeModal}
      />
    </div>
  );
}
