"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { EFFECTS_CATALOG } from "@/data/effects";

export function EffectPickerDialog({
  activeList,
  onSelect,
  onCancel,
}: {
  activeList: string[];
  onSelect: (nome: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const available = Object.entries(EFFECTS_CATALOG).filter(([nome]) => !activeList.includes(nome));
  const q = query.trim().toLowerCase();
  const filtered = q
    ? available.filter(([nome, info]) => (nome + " " + info.desc).toLowerCase().includes(q))
    : available;

  return (
    <Modal onClose={onCancel} wide>
      <div className="modal-title">Adicionar Efeito</div>
      <input
        type="text"
        className="rulebook-search"
        placeholder="Buscar efeito..."
        style={{ marginBottom: 10 }}
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="effect-picker-list">
        {filtered.length === 0 ? (
          <div className="side-empty">Todos os efeitos já estão ativos.</div>
        ) : (
          filtered.map(([nome, info]) => (
            <button key={nome} type="button" className="effect-picker-row" onClick={() => onSelect(nome)}>
              <span className="effect-picker-name">{nome}</span>
              <span className="effect-picker-desc">{info.desc}</span>
            </button>
          ))
        )}
      </div>
      <button type="button" className="btn ghost small" onClick={onCancel}>
        Cancelar
      </button>
    </Modal>
  );
}
