"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ROLL_MODES } from "@/data/roll-modes";
import type { RollModeKey } from "@/lib/dice";

export function ChoiceDialog({
  title,
  includeBonus,
  onSelect,
  onCancel,
}: {
  title: string;
  includeBonus?: boolean;
  onSelect: (mode: RollModeKey, bonus: number) => void;
  onCancel: () => void;
}) {
  const [bonus, setBonus] = useState(0);

  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">{title}</div>
      {includeBonus && (
        <div className="field" style={{ marginBottom: 14, textAlign: "left" }}>
          <label>Bônus (opcional)</label>
          <input
            type="number"
            value={bonus}
            step={1}
            autoFocus
            onChange={(e) => setBonus(parseFloat(e.target.value) || 0)}
          />
        </div>
      )}
      <div className="modal-options">
        {Object.entries(ROLL_MODES).map(([key, mode]) => (
          <button
            key={key}
            type="button"
            className={`modal-opt-btn ${key === "normal" ? "is-normal" : ""}`}
            onClick={() => onSelect(key as RollModeKey, bonus)}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <button type="button" className="btn ghost small" onClick={onCancel}>
        Cancelar
      </button>
    </Modal>
  );
}
