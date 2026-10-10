"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ABILITIES_LIBRARY, CLASSES_ORDENADAS, type AbilityEntry } from "@/lib/classes-lookup";
import type { HabilidadeClasse } from "@/lib/sheet-types";

// Uma escolha do diálogo: a habilidade do catálogo e quais aprimoramentos (índices) marcar.
export type HabilidadeEscolhida = { entry: AbilityEntry; aprims: number[] };

type Sel = { on: boolean; aprim: boolean[] };

/** Linha de habilidade base da ficha a partir da entrada do catálogo (mesmo formato do wizard). */
export function habilidadeDoCatalogo(entry: AbilityEntry): HabilidadeClasse {
  return {
    nome: entry.nome,
    tipo: entry.tipo,
    custo: entry.custo,
    custoPE: entry.custoPE !== undefined ? String(entry.custoPE) : "",
    efeito: entry.efeito,
    indent: false,
    usosGastos: 0,
    temContador: false,
    contadorMax: "",
    contadorAtual: 0,
  };
}

/** Linha de aprimoramento (indentada) a partir do catálogo. */
export function aprimoramentoDoCatalogo(entry: AbilityEntry, ai: number): HabilidadeClasse {
  const ap = (entry.aprimoramentos ?? [])[ai];
  return {
    nome: ap.nome,
    tipo: "—",
    custo: "1 PH",
    custoPE: ap.custoPE !== undefined ? String(ap.custoPE) : "",
    efeito: ap.efeito,
    indent: true,
    ativo: true,
    usosGastos: 0,
    temContador: false,
    contadorMax: "",
    contadorAtual: 0,
  };
}

export function AdicionarHabilidadeDialog({
  habilidades,
  onAdd,
  onCancel,
}: {
  habilidades: HabilidadeClasse[];
  onAdd: (escolhas: HabilidadeEscolhida[]) => void;
  onCancel: () => void;
}) {
  const [classe, setClasse] = useState<string>(CLASSES_ORDENADAS[0]);
  const [search, setSearch] = useState("");
  const [selecoes, setSelecoes] = useState<Record<string, Sel>>({});

  const basesNaFicha = new Set(habilidades.filter((h) => !h.indent).map((h) => h.nome));
  const aprimsNaFicha = new Set(habilidades.filter((h) => h.indent).map((h) => h.nome));

  const q = search.trim().toLowerCase();
  const lista = (ABILITIES_LIBRARY[classe] || []).filter(
    (e) => !q || (e.nome + " " + e.efeito).toLowerCase().includes(q)
  );

  function selDe(nome: string): Sel {
    return selecoes[nome] || { on: false, aprim: [] };
  }
  function toggleBase(nome: string, on: boolean) {
    setSelecoes((prev) => ({ ...prev, [nome]: { on, aprim: on ? prev[nome]?.aprim || [] : [] } }));
  }
  function toggleAprim(nome: string, ai: number, on: boolean) {
    setSelecoes((prev) => {
      const atual = prev[nome] || { on: false, aprim: [] };
      const aprim = atual.aprim.slice();
      aprim[ai] = on;
      return { ...prev, [nome]: { ...atual, aprim } };
    });
  }

  // Junta as escolhas de todas as classes (dá pra marcar em várias abas antes de confirmar).
  const escolhas: HabilidadeEscolhida[] = [];
  for (const c of CLASSES_ORDENADAS) {
    for (const entry of ABILITIES_LIBRARY[c] || []) {
      const sel = selecoes[entry.nome];
      if (!sel) continue;
      const jaTem = basesNaFicha.has(entry.nome);
      const aprims = sel.aprim.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
      if ((sel.on && !jaTem) || aprims.length > 0) escolhas.push({ entry, aprims });
    }
  }
  const total = escolhas.reduce((n, e) => n + (basesNaFicha.has(e.entry.nome) ? 0 : 1) + e.aprims.length, 0);

  return (
    <Modal onClose={onCancel} wide>
      <div className="modal-title">Adicionar Habilidades</div>
      <div className="wizard-class-buttons">
        {CLASSES_ORDENADAS.map((c) => (
          <button
            key={c}
            type="button"
            className={`wizard-class-btn ${classe === c ? "active" : ""}`}
            onClick={() => setClasse(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <input
        type="text"
        className="ability-search-input"
        placeholder="🔍 Buscar habilidade..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="wizard-ability-list add-hab-lista">
        {lista.length === 0 && <div className="derived-note">Nenhuma habilidade encontrada.</div>}
        {lista.map((entry) => {
          const jaTem = basesNaFicha.has(entry.nome);
          const sel = selDe(entry.nome);
          const baseOn = jaTem || sel.on;
          return (
            <div key={entry.nome} className={`wizard-ability-block ${jaTem ? "ja-na-ficha" : ""}`}>
              <label className="chk-inline">
                <input
                  type="checkbox"
                  className="ability-select-checkbox"
                  checked={baseOn}
                  disabled={jaTem}
                  onChange={(e) => toggleBase(entry.nome, e.target.checked)}
                />
                <b>{entry.nome}</b> — <span className="ability-meta">{entry.tipo} · {entry.custo}</span>
                {jaTem && <span className="ja-na-ficha-tag">já na ficha</span>}
              </label>
              <div className="ability-desc">{entry.efeito}</div>
              {(entry.aprimoramentos ?? []).length > 0 && (
                <div className="wizard-aprim-list">
                  {(entry.aprimoramentos ?? []).map((ap, ai) => {
                    const apTem = jaTem && aprimsNaFicha.has(ap.nome);
                    return (
                      <label key={ap.nome} className="chk-inline aprim-line">
                        <input
                          type="checkbox"
                          className="ability-select-checkbox"
                          checked={apTem || !!sel.aprim[ai]}
                          disabled={apTem || !baseOn}
                          onChange={(e) => toggleAprim(entry.nome, ai, e.target.checked)}
                        />
                        {ap.nome}: {ap.efeito}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="add-hab-footer">
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn small" disabled={total === 0} onClick={() => onAdd(escolhas)}>
          Adicionar{total > 0 ? ` (${total})` : ""}
        </button>
      </div>
    </Modal>
  );
}
