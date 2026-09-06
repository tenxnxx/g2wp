"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmModal({
  open,
  title = "ยืนยันการลบ",
  description,
  confirmLabel = "ลบ",
  cancelLabel = "ยกเลิก",
  confirmVariant = "danger",
  pending = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={pending}
      title={title}
      description={description}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={pending}
            className="w-full sm:w-auto sm:min-w-28"
          >
            {pending ? (
              <>
                <Spinner />
                กำลังดำเนินการ...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-[var(--ink-muted)]">
        โปรดยืนยันก่อนดำเนินการต่อ
      </p>
    </Modal>
  );
}
