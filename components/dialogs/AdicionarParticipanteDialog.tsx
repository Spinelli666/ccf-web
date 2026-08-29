"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { ParticipanteSelecionavel } from "@/components/dialogs/IniciarCombateDialog";

export function AdicionarParticipanteDialog({
  sheetsDisponiveis,
  onCancel,
  onAdd,
}: {
  sheetsDisponiveis: ParticipanteSelecionavel[];
  onCancel: () => void;
  onAdd: (participante: { sheetId: string | null; nome: string; mostrarStatus: boolean }) => void;
}) {
  const [sheetId, setSheetId] = useState<string>("");
  const [nomeCustom, setNomeCustom] = useState("");
  const [mostrarStatus, setMostrarStatus] = useState(false);

  function confirmar() {
    if (sheetId) {
      const s = sheetsDisponiveis.find((x) => x.id === sheetId);
      if (!s) return;
      onAdd({ sheetId: s.id, nome: s.name, mostrarStatus });
    } else {
      const nome = nomeCustom.trim();
      if (!nome) return;
      onAdd({ sheetId: null, nome, mostrarStatus: false });
    }
  }

  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">+ Adicionar ao Combate</div>
      {sheetsDisponiveis.length > 0 && (
        <div className="field" style={{ marginBottom: 12, textAlign: "left" }}>
          <label>Ficha da mesa</label>
          <select value={sheetId} onChange={(e) => setSheetId(e.target.value)}>
            <option value="">— Nenhuma (NPC avulso) —</option>
            {sheetsDisponiveis.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {!sheetId && (
        <div className="field" style={{ marginBottom: 12, textAlign: "left" }}>
          <label>Nome do NPC/monstro</label>
          <input
            type="text"
            value={nomeCustom}
            placeholder="Ex: Lobo Sombrio"
            autoFocus
            onChange={(e) => setNomeCustom(e.target.value)}
          />
        </div>
      )}
      {sheetId && (
        <label className="chk-inline" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={mostrarStatus} onChange={(e) => setMostrarStatus(e.target.checked)} />
          Mostrar vida/energia na coluna de combate
        </label>
      )}
      <div className="modal-options">
        <button type="button" className="btn" disabled={!sheetId && !nomeCustom.trim()} onClick={confirmar}>
          Adicionar
        </button>
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
