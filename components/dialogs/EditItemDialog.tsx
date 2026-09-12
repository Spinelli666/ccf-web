"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { Arma, Armadura, Remedio } from "@/lib/sheet-types";

const PESO_OPCOES = [
  { value: "leve", label: "Leve" },
  { value: "medio", label: "Médio" },
  { value: "pesado", label: "Pesado" },
  { value: "mpesado", label: "M. Pesado" },
];

export type EditTarget =
  | { tipo: "arma"; idx: number; data: Arma }
  | { tipo: "armadura"; idx: number; data: Armadura }
  | { tipo: "generico"; idx: number; data: Remedio };

export function EditItemDialog({
  target,
  onSave,
  onRemove,
  onCancel,
}: {
  target: EditTarget;
  onSave: (patch: Partial<Arma> | Partial<Armadura> | Partial<Remedio>) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const [item, setItem] = useState(target.data.item);
  const [preco, setPreco] = useState(target.data.preco);
  const [peso, setPeso] = useState(target.data.peso || "medio");
  const [dano, setDano] = useState(target.tipo === "arma" ? target.data.dano : "");
  const [propriedades, setPropriedades] = useState(target.tipo === "arma" ? target.data.propriedades : "");
  const [parte, setParte] = useState(target.tipo === "armadura" ? target.data.parte : "");
  const [armadura, setArmadura] = useState(target.tipo === "armadura" ? target.data.armadura : "");
  const [efeito, setEfeito] = useState(target.tipo === "generico" ? target.data.efeito : "");
  const [durabilidadeMax, setDurabilidadeMax] = useState(
    target.tipo === "arma" || target.tipo === "armadura" ? String(target.data.durabilidadeMax) : ""
  );
  const [confirmarRemover, setConfirmarRemover] = useState(false);

  function salvar() {
    if (!item.trim()) return;
    if (target.tipo === "arma" || target.tipo === "armadura") {
      const novoMax = Math.max(0, parseInt(durabilidadeMax, 10) || 0);
      const durabilidadeAtual = Math.min(target.data.durabilidadeAtual, novoMax);
      if (target.tipo === "arma") {
        onSave({ item: item.trim(), dano, propriedades, preco, peso, durabilidadeMax: novoMax, durabilidadeAtual });
      } else {
        onSave({ item: item.trim(), parte, armadura, preco, peso, durabilidadeMax: novoMax, durabilidadeAtual });
      }
    } else {
      onSave({ item: item.trim(), efeito, preco, peso });
    }
  }

  const titulo = target.tipo === "arma" ? "Editar Arma" : target.tipo === "armadura" ? "Editar Armadura" : "Editar Item Genérico";

  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">{titulo}</div>

      <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
        <label>Nome</label>
        <input type="text" value={item} autoFocus onChange={(e) => setItem(e.target.value)} />
      </div>

      {target.tipo === "arma" && (
        <>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Dano</label>
            <input type="text" value={dano} onChange={(e) => setDano(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Propriedades</label>
            <input type="text" value={propriedades} onChange={(e) => setPropriedades(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Durabilidade Máxima</label>
            <input type="number" min={0} value={durabilidadeMax} onChange={(e) => setDurabilidadeMax(e.target.value)} />
          </div>
        </>
      )}

      {target.tipo === "armadura" && (
        <>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Parte do corpo</label>
            <input type="text" value={parte} onChange={(e) => setParte(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Armadura</label>
            <input type="text" value={armadura} onChange={(e) => setArmadura(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Durabilidade Máxima</label>
            <input type="number" min={0} value={durabilidadeMax} onChange={(e) => setDurabilidadeMax(e.target.value)} />
          </div>
        </>
      )}

      {target.tipo === "generico" && (
        <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
          <label>Descrição</label>
          <textarea style={{ width: "100%", minHeight: 70 }} value={efeito} onChange={(e) => setEfeito(e.target.value)} />
        </div>
      )}

      <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
        <label>Peso</label>
        <select value={peso} onChange={(e) => setPeso(e.target.value)}>
          {PESO_OPCOES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field" style={{ marginBottom: 14, textAlign: "left" }}>
        <label>Preço (opcional)</label>
        <input type="text" value={preco} onChange={(e) => setPreco(e.target.value)} />
      </div>

      <div className="modal-options">
        <button type="button" className="btn" disabled={!item.trim()} onClick={salvar}>
          ✅ Salvar
        </button>
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      {confirmarRemover ? (
        <div className="modal-message" style={{ marginTop: 14 }}>
          Remover &quot;{target.data.item}&quot; de vez?
          <div className="modal-options" style={{ marginTop: 8 }}>
            <button type="button" className="btn danger" onClick={onRemove}>
              🗑️ Confirmar Remoção
            </button>
            <button type="button" className="btn ghost small" onClick={() => setConfirmarRemover(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn ghost small"
          style={{ marginTop: 14, color: "#8a3a2a", borderColor: "#8a3a2a" }}
          onClick={() => setConfirmarRemover(true)}
        >
          🗑️ Remover Item
        </button>
      )}
    </Modal>
  );
}
