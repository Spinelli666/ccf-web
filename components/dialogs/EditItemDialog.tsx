"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { getPericiaBonuses } from "@/lib/derived";
import type { Arma, Armadura, PericiaBonusItem, Remedio } from "@/lib/sheet-types";

const PESO_OPCOES = [
  { value: "leve", label: "Leve" },
  { value: "medio", label: "Médio" },
  { value: "pesado", label: "Pesado" },
  { value: "mpesado", label: "M. Pesado" },
];

const PERICIA_NOMES = [
  "Força",
  "Vigor",
  "Evasão",
  "Persuasão",
  "Precisão",
  "Inteligência",
  "Destreza",
  "Furtividade",
  "Psionismo",
];

// Sugestões pro campo "Parte do corpo" (continua aceitando texto livre).
const PARTES_CORPO = ["Cabeça", "Torso", "Braços", "Pernas", "Pés", "Acessórios"];

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
  const [protecao, setProtecao] = useState(target.tipo === "arma" ? target.data.protecao || "" : "");
  const [parte, setParte] = useState(target.tipo === "armadura" ? target.data.parte : "");
  const [armadura, setArmadura] = useState(target.tipo === "armadura" ? target.data.armadura : "");
  const [inventarioBonus, setInventarioBonus] = useState(
    target.tipo === "armadura" ? target.data.inventarioBonus || "" : ""
  );
  const [periciaBonuses, setPericiaBonuses] = useState<PericiaBonusItem[]>(
    target.tipo === "armadura" ? getPericiaBonuses(target.data) : []
  );
  const [deslocamentoBonus, setDeslocamentoBonus] = useState(
    target.tipo === "armadura" ? target.data.deslocamentoBonus || "" : ""
  );
  const [peBonus, setPeBonus] = useState(target.tipo === "armadura" ? target.data.peBonus || "" : "");
  const [pvBonus, setPvBonus] = useState(target.tipo === "armadura" ? target.data.pvBonus || "" : "");
  const [descricao, setDescricao] = useState(
    target.tipo === "arma" || target.tipo === "armadura" ? target.data.descricao || "" : ""
  );
  const [efeito, setEfeito] = useState(target.tipo === "generico" ? target.data.efeito : "");
  const [durabilidadeMax, setDurabilidadeMax] = useState(
    target.tipo === "arma" || target.tipo === "armadura" ? String(target.data.durabilidadeMax) : ""
  );
  const [confirmarRemover, setConfirmarRemover] = useState(false);

  function addPericiaBonus() {
    setPericiaBonuses((prev) => [...prev, { pericia: PERICIA_NOMES[0], valor: "1" }]);
  }
  function updatePericiaBonus(i: number, field: keyof PericiaBonusItem, value: string) {
    setPericiaBonuses((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }
  function removePericiaBonus(i: number) {
    setPericiaBonuses((prev) => prev.filter((_, idx) => idx !== i));
  }

  function salvar() {
    if (!item.trim()) return;
    if (target.tipo === "arma" || target.tipo === "armadura") {
      const novoMax = Math.max(0, parseInt(durabilidadeMax, 10) || 0);
      const durabilidadeAtual = Math.min(target.data.durabilidadeAtual, novoMax);
      if (target.tipo === "arma") {
        onSave({ item: item.trim(), dano, propriedades, preco, peso, descricao, protecao, durabilidadeMax: novoMax, durabilidadeAtual });
      } else {
        onSave({
          item: item.trim(),
          parte,
          armadura,
          preco,
          peso,
          descricao,
          inventarioBonus,
          periciaBonuses: periciaBonuses.filter((b) => b.pericia.trim()),
          periciaBonusNome: undefined,
          periciaBonusValor: undefined,
          deslocamentoBonus,
          peBonus,
          pvBonus,
          durabilidadeMax: novoMax,
          durabilidadeAtual,
        });
      }
    } else {
      onSave({ item: item.trim(), efeito, preco, peso });
    }
  }

  const titulo = target.tipo === "arma" ? "Editar Arma" : target.tipo === "armadura" ? "Editar Armadura" : "Editar Item Genérico";
  const icone = target.tipo === "arma" ? "🗡️" : target.tipo === "armadura" ? "🛡️" : "🎒";

  const campoPeso = (
    <div className="field">
      <label>Peso</label>
      <select value={peso} onChange={(e) => setPeso(e.target.value)}>
        {PESO_OPCOES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
  const campoPreco = (
    <div className="field">
      <label>Preço</label>
      <input type="text" value={preco} placeholder="Opcional" onChange={(e) => setPreco(e.target.value)} />
    </div>
  );
  const campoDurabilidade = (
    <div className="field">
      <label>Durabilidade Máx.</label>
      <input type="number" min={0} value={durabilidadeMax} onChange={(e) => setDurabilidadeMax(e.target.value)} />
    </div>
  );
  const campoDescricao = (texto: string, setTexto: (v: string) => void) => (
    <div className="field span-3">
      <label>Descrição</label>
      <textarea rows={3} value={texto} placeholder="O que é / história / detalhes..." onChange={(e) => setTexto(e.target.value)} />
    </div>
  );

  return (
    <Modal onClose={onCancel} wide>
      <div className="modal-title">
        {icone} {titulo}
      </div>

      <div className="item-form">
        <div className="item-form-section">
          <div className="item-form-section-title">Geral</div>
          <div className="item-form-grid">
            <div className="field span-3">
              <label>Nome</label>
              <input type="text" value={item} autoFocus onChange={(e) => setItem(e.target.value)} />
            </div>

            {target.tipo === "arma" && (
              <>
                <div className="field">
                  <label>Dano</label>
                  <input type="text" value={dano} onChange={(e) => setDano(e.target.value)} />
                </div>
                <div className="field">
                  <label>Proteção equipada</label>
                  <input type="text" value={protecao} placeholder="Ex: 3" onChange={(e) => setProtecao(e.target.value)} />
                </div>
                {campoDurabilidade}
                <div className="field span-3">
                  <label>Propriedades</label>
                  <input type="text" value={propriedades} onChange={(e) => setPropriedades(e.target.value)} />
                </div>
              </>
            )}

            {target.tipo === "armadura" && (
              <>
                <div className="field">
                  <label>Parte do corpo</label>
                  <input type="text" list="partes-corpo" value={parte} onChange={(e) => setParte(e.target.value)} />
                  <datalist id="partes-corpo">
                    {PARTES_CORPO.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label>Armadura</label>
                  <input type="text" value={armadura} onChange={(e) => setArmadura(e.target.value)} />
                </div>
                {campoDurabilidade}
              </>
            )}

            {campoPeso}
            {campoPreco}
          </div>
        </div>

        {target.tipo === "armadura" && (
          <div className="item-form-section">
            <div className="item-form-section-title">Bônus quando equipada (opcional)</div>
            <div className="item-form-grid item-form-grid-4">
              <div className="field">
                <label>❤️ PV</label>
                <input type="text" value={pvBonus} placeholder="Ex: 5" onChange={(e) => setPvBonus(e.target.value)} />
              </div>
              <div className="field">
                <label>🔥 PE</label>
                <input type="text" value={peBonus} placeholder="Ex: 1" onChange={(e) => setPeBonus(e.target.value)} />
              </div>
              <div className="field">
                <label>⚡ Deslocamento</label>
                <input
                  type="text"
                  value={deslocamentoBonus}
                  placeholder="Ex: 1"
                  onChange={(e) => setDeslocamentoBonus(e.target.value)}
                />
              </div>
              <div className="field">
                <label>📦 Inventário</label>
                <input
                  type="text"
                  value={inventarioBonus}
                  placeholder="Ex: 10"
                  onChange={(e) => setInventarioBonus(e.target.value)}
                />
              </div>
            </div>

            <div className="item-form-pericias">
              <label className="item-form-sublabel">🎯 Bônus de perícia</label>
              {periciaBonuses.map((b, i) => (
                <div className="item-form-pericia-row" key={i}>
                  <select value={b.pericia} onChange={(e) => updatePericiaBonus(i, "pericia", e.target.value)}>
                    {PERICIA_NOMES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={b.valor}
                    placeholder="Ex: 1"
                    onChange={(e) => updatePericiaBonus(i, "valor", e.target.value)}
                  />
                  <button
                    type="button"
                    className="icon-btn is-danger"
                    title="Remover bônus"
                    aria-label="Remover bônus"
                    onClick={() => removePericiaBonus(i)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
              <button type="button" className="add-row-btn" onClick={addPericiaBonus}>
                + Adicionar bônus de perícia
              </button>
            </div>
          </div>
        )}

        <div className="item-form-section">
          <div className="item-form-grid">
            {target.tipo === "generico" ? campoDescricao(efeito, setEfeito) : campoDescricao(descricao, setDescricao)}
          </div>
        </div>

        {confirmarRemover ? (
          <div className="item-form-confirm">
            <span>Remover &quot;{target.data.item}&quot; de vez?</span>
            <div className="item-form-footer-actions">
              <button type="button" className="btn ghost small" onClick={() => setConfirmarRemover(false)}>
                Cancelar
              </button>
              <button type="button" className="btn danger small" onClick={onRemove}>
                🗑️ Confirmar Remoção
              </button>
            </div>
          </div>
        ) : (
          <div className="item-form-footer">
            <button type="button" className="btn ghost small is-danger item-form-remove" onClick={() => setConfirmarRemover(true)}>
              🗑️ Remover Item
            </button>
            <div className="item-form-footer-actions">
              <button type="button" className="btn ghost small" onClick={onCancel}>
                Cancelar
              </button>
              <button type="button" className="btn" disabled={!item.trim()} onClick={salvar}>
                ✅ Salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
