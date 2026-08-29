"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

export type ParticipanteSelecionavel = { id: string; name: string; ownerId: string };

export function IniciarCombateDialog({
  sheets,
  onCancel,
  onStart,
}: {
  sheets: ParticipanteSelecionavel[];
  onCancel: () => void;
  onStart: (participantes: { sheetId: string; nome: string; mostrarStatus: boolean }[]) => void;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [mostrarStatus, setMostrarStatus] = useState<Set<string>>(new Set());

  function toggleSel(id: string) {
    const next = new Set(selecionados);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelecionados(next);
  }

  function toggleStatus(id: string) {
    const next = new Set(mostrarStatus);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setMostrarStatus(next);
  }

  function confirmar() {
    const participantes = sheets
      .filter((s) => selecionados.has(s.id))
      .map((s) => ({ sheetId: s.id, nome: s.name, mostrarStatus: mostrarStatus.has(s.id) }));
    if (participantes.length === 0) return;
    onStart(participantes);
  }

  return (
    <Modal onClose={onCancel} wide>
      <div className="modal-title">⚔️ Iniciar Combate</div>
      <div className="modal-message">Escolha quem participa e, se quiser, mostre a vida/energia deles na coluna.</div>
      <div className="lv-ability-list" style={{ marginBottom: 14 }}>
        {sheets.length === 0 && <div className="derived-note">Nenhuma ficha disponível nessa mesa ainda.</div>}
        {sheets.map((s) => {
          const sel = selecionados.has(s.id);
          return (
            <div key={s.id} className="wizard-ability-block">
              <label className="chk-inline">
                <input type="checkbox" checked={sel} onChange={() => toggleSel(s.id)} />
                <b>{s.name}</b>
              </label>
              {sel && (
                <label className="chk-inline" style={{ marginTop: 4, marginLeft: 22 }}>
                  <input
                    type="checkbox"
                    checked={mostrarStatus.has(s.id)}
                    onChange={() => toggleStatus(s.id)}
                  />
                  Mostrar vida/energia na coluna de combate
                </label>
              )}
            </div>
          );
        })}
      </div>
      <div className="modal-options">
        <button type="button" className="btn" disabled={selecionados.size === 0} onClick={confirmar}>
          Iniciar Combate
        </button>
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
