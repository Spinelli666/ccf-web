"use client";

import { useState } from "react";
import { computeDerived, num, clamp, regraDeMortePatch } from "@/lib/derived";
import { EFFECTS_CATALOG } from "@/data/effects";
import { SURVIVAL_EFFECTS_CATALOG } from "@/lib/survival-effects";
import { EffectPickerDialog } from "@/components/dialogs/EffectPickerDialog";
import type { FullSheetData } from "@/lib/sheet-types";

type EffectInfo = { desc: string; icone?: string; danoRodada?: number; manualDano?: number };

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
    const morte = regraDeMortePatch(pvAtual, novoPv, derived.pvMax);
    onChange({ stats: { ...sheet.stats, pvAtual: String(novoPv) }, ...morte });
    onLog(
      `⚠️ ${nome} sofreu ${valor} de dano de "${nomeEfeito}" — PV: ${novoPv}/${derived.pvMax}${
        morte.morto && !sheet.morto ? " — ☠️ MORREU (PV chegou a -metade do máximo)" : ""
      }`
    );
  }

  return (
    <div className="section">
      <h2>Efeitos</h2>
      {isMine && (
        <div className="add-row-center" style={{ marginBottom: 12 }}>
          <button type="button" className="btn small" onClick={() => setShowPicker(true)}>
            + Adicionar Efeito
          </button>
        </div>
      )}
      {sheet.efeitosAtivos.length > 0 ? (
        <div className="efeito-lista">
          {sheet.efeitosAtivos.map((nomeEfeito) => {
            const info =
              (EFFECTS_CATALOG as Record<string, EffectInfo>)[nomeEfeito] ||
              SURVIVAL_EFFECTS_CATALOG[nomeEfeito] ||
              { desc: "" };
            const danoValor = info.danoRodada || info.manualDano;
            return (
              <div key={nomeEfeito} className="efeito-card">
                <span className="efeito-icone" aria-hidden="true">
                  {info.icone || "✦"}
                </span>
                <div className="efeito-texto">
                  <div className="efeito-nome">{nomeEfeito}</div>
                  {info.desc && <div className="efeito-desc">{info.desc}</div>}
                </div>
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
                    <button
                      type="button"
                      className="btn ghost small emoji-btn is-danger"
                      title="Remover"
                      aria-label="Remover"
                      onClick={() => remove(nomeEfeito)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="derived-note">Nenhum efeito ativo no momento.</div>
      )}
      {showPicker && (
        <EffectPickerDialog activeList={sheet.efeitosAtivos} onSelect={add} onCancel={() => setShowPicker(false)} />
      )}
    </div>
  );
}
