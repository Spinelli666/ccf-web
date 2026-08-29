"use client";

import { useState } from "react";
import { computeDerived, num, clamp } from "@/lib/derived";
import { EFFECTS_CATALOG } from "@/data/effects";
import { EffectPickerDialog } from "@/components/dialogs/EffectPickerDialog";
import type { FullSheetData } from "@/lib/sheet-types";

type EffectInfo = { desc: string; danoRodada?: number; manualDano?: number };

export function EffectsPanel({
  sheet,
  isMine,
  onChange,
  onLog,
}: {
  sheet: FullSheetData;
  isMine: boolean;
  onChange: (patch: Partial<FullSheetData>) => void;
  onLog: (text: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const derived = computeDerived(sheet);
  const nome = sheet.name || "Personagem";

  function remove(nomeEfeito: string) {
    onChange({ efeitosAtivos: sheet.efeitosAtivos.filter((e) => e !== nomeEfeito) });
    onLog(`${nome} removeu o efeito "${nomeEfeito}"`);
  }
  function add(nomeEfeito: string) {
    onChange({ efeitosAtivos: [...sheet.efeitosAtivos, nomeEfeito] });
    onLog(`${nome} recebeu o efeito "${nomeEfeito}"`);
    setShowPicker(false);
  }
  function aplicarDano(nomeEfeito: string, valor: number) {
    const pvAtual = clamp(num(sheet.stats.pvAtual), -derived.pvMax, derived.pvMax);
    const novoPv = clamp(pvAtual - valor, -derived.pvMax, derived.pvMax);
    onChange({ stats: { ...sheet.stats, pvAtual: String(novoPv) } });
    onLog(`⚠️ ${nome} sofreu ${valor} de dano de "${nomeEfeito}" — PV: ${novoPv}/${derived.pvMax}`);
  }

  return (
    <div className="section">
      <h2>Efeitos Ativos</h2>
      {sheet.efeitosAtivos.length > 0 ? (
        <table className="sheet-table">
          <thead>
            <tr>
              <th>Efeito</th>
              <th>Descrição</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sheet.efeitosAtivos.map((nomeEfeito) => {
              const info = (EFFECTS_CATALOG as Record<string, EffectInfo>)[nomeEfeito] || { desc: "" };
              const danoValor = info.danoRodada || info.manualDano;
              return (
                <tr key={nomeEfeito}>
                  <td className="name">{nomeEfeito}</td>
                  <td>{info.desc}</td>
                  <td>
                    <div className="effect-row-actions">
                      {isMine && danoValor && (
                        <button
                          type="button"
                          className="effect-dano-btn"
                          title={`Aplica ${danoValor} de dano direto (ignora armadura)`}
                          onClick={() => aplicarDano(nomeEfeito, danoValor)}
                        >
                          -{danoValor}
                        </button>
                      )}
                      {isMine && (
                        <button type="button" className="btn ghost small" onClick={() => remove(nomeEfeito)}>
                          Remover
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="derived-note">Nenhum efeito ativo no momento.</div>
      )}
      {isMine && (
        <button type="button" className="add-row-btn" style={{ marginTop: 12 }} onClick={() => setShowPicker(true)}>
          + Adicionar Efeito
        </button>
      )}

      {showPicker && (
        <EffectPickerDialog activeList={sheet.efeitosAtivos} onSelect={add} onCancel={() => setShowPicker(false)} />
      )}
    </div>
  );
}
