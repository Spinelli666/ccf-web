"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { HabilidadeClasse } from "@/lib/sheet-types";

export function EditHabilidadeDialog({
  habilidade,
  onSave,
  onCancel,
}: {
  habilidade: HabilidadeClasse;
  onSave: (patch: Partial<HabilidadeClasse>) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(habilidade.nome);
  const [tipo, setTipo] = useState(habilidade.tipo);
  const [custo, setCusto] = useState(habilidade.custo);
  const [custoPE, setCustoPE] = useState(habilidade.custoPE ?? "");
  const [efeito, setEfeito] = useState(habilidade.efeito);
  const [temContador, setTemContador] = useState(habilidade.temContador);
  const [contadorMax, setContadorMax] = useState(habilidade.contadorMax || "");

  function salvar() {
    if (!nome.trim()) return;
    onSave({
      nome: nome.trim(),
      tipo,
      custo,
      custoPE: custoPE.trim(),
      efeito,
      temContador,
      contadorMax: temContador ? contadorMax : habilidade.contadorMax,
      contadorAtual: temContador ? Math.min(habilidade.contadorAtual, parseInt(contadorMax, 10) || 0) : habilidade.contadorAtual,
    });
  }

  return (
    <Modal onClose={onCancel} wide>
      <div className="modal-title">{habilidade.indent ? "Editar Aprimoramento" : "Editar Habilidade"}</div>
      <div className="item-form">
        <div className="item-form-grid">
          <div className="field span-3">
            <label>Nome</label>
            <input type="text" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="field">
            <label>Tipo</label>
            <input type="text" value={tipo} placeholder="Ex: Ação Longa" onChange={(e) => setTipo(e.target.value)} />
          </div>
          <div className="field">
            <label>Custo (texto exibido)</label>
            <input type="text" value={custo} placeholder="Ex: ◆◆ · 3⚡" onChange={(e) => setCusto(e.target.value)} />
          </div>
          <div className="field">
            <label>PE gastos ao usar</label>
            <input type="number" min={0} value={custoPE} placeholder="0" onChange={(e) => setCustoPE(e.target.value)} />
          </div>
          {!habilidade.indent && (
            <>
              <label className="item-form-check span-2">
                <input type="checkbox" checked={temContador} onChange={(e) => setTemContador(e.target.checked)} /> Tem
                contador
              </label>
              <div className="field">
                <label>Contador máximo</label>
                <input
                  type="number"
                  min={0}
                  value={contadorMax}
                  disabled={!temContador}
                  onChange={(e) => setContadorMax(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="field span-3">
            <label>Efeito</label>
            <textarea rows={6} value={efeito} onChange={(e) => setEfeito(e.target.value)} />
          </div>
        </div>
        <div className="item-form-footer">
          <span />
          <div className="item-form-footer-actions">
            <button type="button" className="btn ghost small" onClick={onCancel}>
              Cancelar
            </button>
            <button type="button" className="btn" disabled={!nome.trim()} onClick={salvar}>
              ✅ Salvar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
