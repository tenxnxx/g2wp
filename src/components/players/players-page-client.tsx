"use client";

import { useState } from "react";
import { PlayerFormModal } from "@/components/players/player-form-modal";
import { PlayerTable } from "@/components/players/player-table";
import { Button } from "@/components/ui/button";
import type { Player } from "@/types/player";

export function PlayersPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(player: Player) {
    setEditing(player);
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
            ตัวละคร
          </h1>
        </div>
        <Button type="button" onClick={openCreate} className="sm:min-w-40">
          + เพิ่มตัวละคร
        </Button>
      </div>

      <PlayerTable onEdit={openEdit} />

      <PlayerFormModal
        open={modalOpen}
        player={editing}
        onClose={closeModal}
      />
    </div>
  );
}
