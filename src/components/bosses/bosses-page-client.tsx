"use client";

import { useState } from "react";
import { BossFormModal } from "@/components/bosses/boss-form-modal";
import { BossSectionNav } from "@/components/bosses/boss-section-nav";
import { BossTable } from "@/components/bosses/boss-table";
import { Button } from "@/components/ui/button";
import type { Boss } from "@/types/boss";

export function BossesPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Boss | null>(null);
  const [formKey, setFormKey] = useState(0);

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(item: Boss) {
    setEditing(item);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <BossSectionNav />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)]">
          บอส
        </h1>
        <Button type="button" onClick={openCreate} className="sm:min-w-40">
          + เพิ่มบอส
        </Button>
      </div>
      <BossTable onEdit={openEdit} />
      <BossFormModal
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
