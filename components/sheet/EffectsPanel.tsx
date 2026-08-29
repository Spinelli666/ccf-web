"use client";

import { useState } from "react";
import { EFFECTS_CATALOG } from "@/data/effects";
import { EffectPickerDialog } from "@/components/dialogs/EffectPickerDialog";
import type { FullSheetData } from "@/lib/sheet-types";

export function EffectsPanel({
  sheet,
  isMine,
  onChange,
}: {
  sheet: FullSheetData;
  isMine: boolean;
  onChange: (patch: Partial<FullSheetData>) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  function remove(nome: string) {
    onChange({ efeitosAtivos: sheet.efeitosAtivos.filter((e) => e !== nome) });
  }
  function add(nome: string) {
    onChange({ efeitosAtivos: [...sheet.efeitosAtivos, nome] });
    setShowPicker(false);
  }

  return (
    <div className="section">
      <h2>Efeitos Ativos</h2>
      <div className="effects-grid">
        {sheet.efeitosAtivos.map((nome) => {
          const info = (EFFECTS_CATALOG as Record<string, { desc: string }>)[nome];
          return (
            <div key={nome} className="effect-chip-wrap">
              <button
                type="button"
                className="effect-chip active"
                title={info?.desc}
                onClick={() => isMine && remove(nome)}
              >
                {nome}
              </button>
            </div>
          );
        })}
        {isMine && (
          <button type="button" className="effect-chip" onClick={() => setShowPicker(true)}>
            + Adicionar
          </button>
        )}
      </div>

      {showPicker && (
        <EffectPickerDialog activeList={sheet.efeitosAtivos} onSelect={add} onCancel={() => setShowPicker(false)} />
      )}
    </div>
  );
}
