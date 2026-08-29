"use client";

import { Modal } from "@/components/ui/Modal";

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">{title}</div>
      <div className="modal-message">{message}</div>
      <div className="modal-options">
        <button type="button" className="btn danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
