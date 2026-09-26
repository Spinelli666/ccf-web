"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { TipoAcaoBadge, selosDoTipo, tipoDosSelos, type SeloKey } from "@/components/sheet/TipoAcaoBadge";

const OPCOES: { key: SeloKey; nome: string; desc: string }[] = [
  { key: "curta", nome: "Ação Curta", desc: "Custa 1 Ponto de Ação (🔸)." },
  { key: "longa", nome: "Ação Longa", desc: "Custa 2 Pontos de Ação (🔸🔸)." },
  { key: "reacao", nome: "Reação", desc: "Usada no turno de outro alvo, 1 por rodada." },
  { key: "passiva", nome: "Passiva", desc: "Sempre ativa, sem custo." },
];

const FOCO = { key: "foco" as const, nome: "Foco", desc: "Mantém 1 Ponto de Ação bloqueado enquanto ativa." };

/** Escolha dos tipos de ação de uma habilidade (abre por cima do Editar Habilidade). */
export function TipoAcaoDialog({
  tipo,
  onConfirm,
  onCancel,
}: {
  tipo: string;
  onConfirm: (tipo: string) => void;
  onCancel: () => void;
}) {
  const [sel, setSel] = useState<Set<SeloKey>>(() => new Set(selosDoTipo(tipo).map((s) => s.key)));
  const texto = tipoDosSelos(sel);

  // Esc fecha só este diálogo, não o Editar Habilidade que está por baixo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCancel();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  function toggle(key: SeloKey) {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function opcao(o: { key: SeloKey; nome: string; desc: string }) {
    const ativo = sel.has(o.key);
    return (
      <button
        key={o.key}
        type="button"
        role="checkbox"
        aria-checked={ativo}
        className={`tipo-opcao tipo-${o.key}${ativo ? " active" : ""}`}
        onClick={() => toggle(o.key)}
      >
        <span className="tipo-opcao-check">{ativo ? "✓" : ""}</span>
        <span className="tipo-opcao-text">
          <span className={`tipo-selo tipo-${o.key}`}>{o.nome}</span>
          <span className="tipo-opcao-desc">{o.desc}</span>
        </span>
      </button>
    );
  }

  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">Tipo da ação</div>
      <div className="modal-message">Marque todos os tipos que essa habilidade tem.</div>
      <div className="tipo-opcoes">{OPCOES.map(opcao)}</div>
      <div className="tipo-opcoes-sub">Modificador</div>
      <div className="tipo-opcoes">{opcao(FOCO)}</div>
      <div className="tipo-preview">
        <span className="tipo-preview-lbl">Fica assim:</span>
        {texto ? <TipoAcaoBadge tipo={texto} /> : <em>Sem tipo</em>}
      </div>
      <div className="modal-options tipo-acoes-footer">
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn" onClick={() => onConfirm(texto)}>
          ✅ Confirmar
        </button>
      </div>
    </Modal>
  );
}
