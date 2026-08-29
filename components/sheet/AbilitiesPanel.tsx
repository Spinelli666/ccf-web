"use client";

import { useState } from "react";
import { num, clamp } from "@/lib/derived";
import { LevelUpDialog } from "@/components/dialogs/LevelUpDialog";
import { computeDerived } from "@/lib/derived";
import type { FullSheetData, HabilidadeClasse, HabilidadeRaca } from "@/lib/sheet-types";

export function AbilitiesPanel({
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
  const [showLevelUp, setShowLevelUp] = useState(false);
  const derived = computeDerived(sheet);

  function updateRaca(i: number, patch: Partial<HabilidadeRaca>) {
    const next = sheet.racaHabilidades.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ racaHabilidades: next });
  }
  function updateClasse(i: number, patch: Partial<HabilidadeClasse>) {
    const next = sheet.classeHabilidades.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ classeHabilidades: next });
  }

  function usarRaca(i: number) {
    const h = sheet.racaHabilidades[i];
    const max = num(h.usosDiarios, 0);
    if (max > 0 && h.usosGastos >= max) return;
    updateRaca(i, { usosGastos: h.usosGastos + 1 });
    onLog(`${sheet.name || "Personagem"} usou a habilidade racial "${h.nome}".`);
  }

  function usarClasse(i: number) {
    const h = sheet.classeHabilidades[i];
    const custoPE = num(h.custoPE, 0);
    if (custoPE > 0) {
      const peAtual = clamp(num(sheet.stats.peAtual) - custoPE, 0, derived.peMax);
      onChange({ stats: { ...sheet.stats, peAtual: String(peAtual) } });
    }
    updateClasse(i, { usosGastos: h.usosGastos + 1 });
    onLog(`${sheet.name || "Personagem"} usou "${h.nome}"${custoPE ? ` (-${custoPE} PE)` : ""}.`);
  }

  return (
    <div className="section">
      <div className="sheet-actions">
        <h2>Habilidades</h2>
        {isMine && (
          <button type="button" className="btn secondary" onClick={() => setShowLevelUp(true)}>
            ⭐ Subir de Nível
          </button>
        )}
      </div>

      {sheet.racaTitulo && (
        <>
          <h3 className="form-section-title" style={{ color: "var(--maroon)", fontFamily: "Cinzel,serif", fontSize: 13 }}>
            Raça — {sheet.racaTitulo}
          </h3>
          {sheet.racaHabilidades.map((h, i) => {
            const max = num(h.usosDiarios, 0);
            return (
              <div key={i} className="ability">
                <div className="ability-row">
                  <div>
                    <b>{h.nome}</b>: {h.desc}
                  </div>
                  {isMine && max > 0 && (
                    <div className="ability-controls">
                      <span className="uses-count">
                        {h.usosGastos}/{max}
                      </span>
                      <button
                        type="button"
                        className={`tag-btn ${h.usosGastos < max ? "avail" : "used"}`}
                        disabled={h.usosGastos >= max}
                        onClick={() => usarRaca(i)}
                      >
                        Usar
                      </button>
                      {h.usosGastos > 0 && (
                        <button type="button" className="tag-btn" onClick={() => updateRaca(i, { usosGastos: 0 })}>
                          ↺
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {sheet.classeTitulo && (
        <>
          <h3 style={{ color: "var(--maroon)", fontFamily: "Cinzel,serif", fontSize: 13, marginTop: 18 }}>
            {sheet.classeTitulo}
            {sheet.subclasseTitulo && ` — ${sheet.subclasseTitulo}`}{" "}
            <span className="ph-tag">({sheet.classePH} PH)</span>
          </h3>
          {sheet.classeHabilidades.map((h, i) => (
            <div key={i} className={`ability ${h.indent ? "indent" : ""}`} style={h.indent ? { marginLeft: 22, fontStyle: "italic" } : undefined}>
              <div className="ability-row">
                <div>
                  <b>{h.nome}</b>{" "}
                  <span className="ability-meta">
                    · {h.tipo} · {h.custo}
                  </span>
                  <div className="ability-desc" style={{ marginLeft: 0 }}>
                    {h.efeito}
                  </div>
                </div>
                {isMine && !h.indent && (
                  <div className="ability-controls">
                    {h.temContador && (
                      <div className="counter">
                        <button
                          type="button"
                          className="counter-btn"
                          onClick={() => updateClasse(i, { contadorAtual: Math.max(0, h.contadorAtual - 1) })}
                        >
                          −
                        </button>
                        <span className="counter-val">
                          {h.contadorAtual}/{h.contadorMax}
                        </span>
                        <button
                          type="button"
                          className="counter-btn"
                          onClick={() =>
                            updateClasse(i, { contadorAtual: Math.min(num(h.contadorMax, 99), h.contadorAtual + 1) })
                          }
                        >
                          +
                        </button>
                      </div>
                    )}
                    <button type="button" className="tag-btn avail" onClick={() => usarClasse(i)}>
                      Usar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {showLevelUp && (
        <LevelUpDialog
          sheet={sheet}
          onCancel={() => setShowLevelUp(false)}
          onApply={(patch) => {
            onChange({
              nivel: patch.nivel,
              classeHabilidades: patch.classeHabilidades,
              pericias: patch.pericias,
              stats: {
                ...sheet.stats,
                pvAtual: String(num(sheet.stats.pvAtual) + 5),
                peAtual: String(num(sheet.stats.peAtual) + 1),
              },
            });
            onLog(`${sheet.name || "Personagem"} subiu para o nível ${patch.nivel}!`);
            setShowLevelUp(false);
          }}
        />
      )}
    </div>
  );
}
