"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

type Fase = "root" | "curta" | "longa";

const OPCOES_CURTA = ["Deslocamento", "Conversar", "Habilidade Básica"];
const OPCOES_LONGA = ["Teste de Perícia", "Atacar", "Habilidade Forte"];

export function AcaoDialog({
  onEscolher,
  onCancel,
}: {
  onEscolher: (tipo: "curta" | "longa", opcao: string) => void;
  onCancel: () => void;
}) {
  const [fase, setFase] = useState<Fase>("root");

  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">Utilizar Ponto de Ação</div>

      {fase === "root" && (
        <>
          <div className="modal-message">O que o personagem vai fazer?</div>
          <div className="modal-options">
            <button type="button" className="modal-opt-btn is-normal" onClick={() => setFase("curta")}>
              🔸 Ação Curta (1 Ponto de Ação)
            </button>
            <button type="button" className="modal-opt-btn" onClick={() => setFase("longa")}>
              🔸🔸 Ação Longa (2 Pontos de Ação)
            </button>
          </div>
          <button type="button" className="btn ghost small" onClick={onCancel}>
            Cancelar
          </button>
        </>
      )}

      {fase === "curta" && (
        <>
          <div className="modal-message">Ação Curta — escolha uma opção:</div>
          <div className="modal-options">
            {OPCOES_CURTA.map((op) => (
              <button key={op} type="button" className="modal-opt-btn" onClick={() => onEscolher("curta", op)}>
                {op}
              </button>
            ))}
          </div>
          <button type="button" className="btn ghost small" onClick={() => setFase("root")}>
            ← Voltar
          </button>
        </>
      )}

      {fase === "longa" && (
        <>
          <div className="modal-message">Ação Longa — escolha uma opção:</div>
          <div className="modal-options">
            {OPCOES_LONGA.map((op) => (
              <button key={op} type="button" className="modal-opt-btn" onClick={() => onEscolher("longa", op)}>
                {op}
              </button>
            ))}
          </div>
          <button type="button" className="btn ghost small" onClick={() => setFase("root")}>
            ← Voltar
          </button>
        </>
      )}
    </Modal>
  );
}
