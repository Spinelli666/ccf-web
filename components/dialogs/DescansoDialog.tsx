"use client";

import { Modal } from "@/components/ui/Modal";

export function DescansoDialog({
  onCurto,
  onLongo,
  onCancel,
}: {
  onCurto: () => void;
  onLongo: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">Descansar</div>
      <div className="modal-options">
        <button type="button" className="modal-opt-btn" onClick={onCurto}>
          ☀️ Descanso Curto (4h)
        </button>
        <button type="button" className="modal-opt-btn" onClick={onLongo}>
          🌙 Descanso Longo (8h)
        </button>
      </div>
      <button type="button" className="btn ghost small" onClick={onCancel}>
        Cancelar
      </button>
    </Modal>
  );
}
