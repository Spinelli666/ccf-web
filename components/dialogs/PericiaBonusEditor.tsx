"use client";

import type { PericiaBonusItem } from "@/lib/sheet-types";

export const PERICIA_NOMES = [
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

/** Lista editável de "+X em tal perícia" — usada por itens (Arma/Armadura) e habilidades. */
export function PericiaBonusEditor({
  value,
  onChange,
}: {
  value: PericiaBonusItem[];
  onChange: (next: PericiaBonusItem[]) => void;
}) {
  function update(i: number, field: keyof PericiaBonusItem, v: string) {
    onChange(value.map((b, k) => (k === i ? { ...b, [field]: v } : b)));
  }

  return (
    <div className="item-form-pericias">
      <label className="item-form-sublabel">🎯 Bônus de perícia</label>
      {value.map((b, i) => (
        <div className="item-form-pericia-row" key={i}>
          <select value={b.pericia} onChange={(e) => update(i, "pericia", e.target.value)}>
            {PERICIA_NOMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <input type="text" value={b.valor} placeholder="Ex: 1" onChange={(e) => update(i, "valor", e.target.value)} />
          <button
            type="button"
            className="icon-btn is-danger"
            title="Remover bônus"
            aria-label="Remover bônus"
            onClick={() => onChange(value.filter((_, k) => k !== i))}
          >
            🗑️
          </button>
        </div>
      ))}
      <button
        type="button"
        className="add-row-btn"
        onClick={() => onChange([...value, { pericia: PERICIA_NOMES[0], valor: "1" }])}
      >
        + Adicionar bônus de perícia
      </button>
    </div>
  );
}
