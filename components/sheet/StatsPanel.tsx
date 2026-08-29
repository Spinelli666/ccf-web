"use client";

import { useState } from "react";
import { computeDerived, num, clamp } from "@/lib/derived";
import { rollDie } from "@/lib/dice";
import { DescansoDialog } from "@/components/dialogs/DescansoDialog";
import type { FullSheetData } from "@/lib/sheet-types";

export function StatsPanel({
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
  const [showRest, setShowRest] = useState(false);
  const derived = computeDerived(sheet);
  const pvAtual = clamp(num(sheet.stats.pvAtual), -derived.pvMax, derived.pvMax);
  const peAtual = clamp(num(sheet.stats.peAtual), 0, derived.peMax);
  const derrotado = pvAtual <= 0;

  function setStat<K extends keyof FullSheetData["stats"]>(key: K, value: string) {
    onChange({ stats: { ...sheet.stats, [key]: value } });
  }

  function applyDelta(field: "pvAtual" | "peAtual", delta: number) {
    const max = field === "pvAtual" ? derived.pvMax : derived.peMax;
    const min = field === "pvAtual" ? -max : 0;
    const current = num(sheet.stats[field]);
    setStat(field, String(clamp(current + delta, min, max)));
  }

  function toggleFratura(i: number) {
    const atual = clamp(num(sheet.fraturas), 0, 5);
    onChange({ fraturas: atual > i ? i : i + 1 });
  }

  function rest(tipo: "curto" | "longo") {
    setShowRest(false);
    const dados = tipo === "curto" ? 1 : 2;
    const multVigor = tipo === "curto" ? 2 : 3;
    const rolls = Array.from({ length: dados }, () => rollDie(20));
    const soma = rolls.reduce((a, b) => a + b, 0);
    const recuperado = soma + multVigor * derived.vigor;
    const novoPv = clamp(num(sheet.stats.pvAtual) + recuperado, -derived.pvMax, derived.pvMax);
    const novoPe = clamp(num(sheet.stats.peAtual) + recuperado, 0, derived.peMax);
    const novasFraturas = tipo === "longo" ? Math.max(0, num(sheet.fraturas) - 1) : num(sheet.fraturas);
    onChange({
      stats: { ...sheet.stats, pvAtual: String(novoPv), peAtual: String(novoPe) },
      fraturas: novasFraturas,
      efeitosAtivos: sheet.efeitosAtivos.filter((e) => e !== "Exaustão"),
    });
    onLog(
      `${sheet.name || "Personagem"} fez um Descanso ${tipo === "curto" ? "Curto" : "Longo"} (${dados}d20${
        multVigor > 0 ? `+${multVigor}×Vigor` : ""
      } = ${recuperado}): recuperou PV e PE.`
    );
  }

  return (
    <div className="section" style={{ marginTop: 0 }}>
      {derrotado && <div className="derrotado-banner">☠️ Derrotado — PV a 0 ou menos</div>}

      <div className="resource-grid">
        <div className="resource-box">
          <div className="resource-label pv-bonus-row">PV</div>
          <div className="resource-bar-wrap">
            <div className="resource-bar">
              <div
                className="resource-fill pv-fill"
                style={{ width: `${Math.max(0, (pvAtual / derived.pvMax) * 100)}%` }}
              />
            </div>
            <div className="resource-bar-text">
              {pvAtual} / {derived.pvMax}
            </div>
          </div>
          <div className="resource-controls">
            <button type="button" className="btn ghost small" disabled={!isMine} onClick={() => applyDelta("pvAtual", -1)}>
              -1
            </button>
            <input
              type="number"
              className="resource-delta-input"
              disabled={!isMine}
              value={sheet.stats.pvAtual}
              onChange={(e) => setStat("pvAtual", e.target.value)}
            />
            <button type="button" className="btn ghost small" disabled={!isMine} onClick={() => applyDelta("pvAtual", 1)}>
              +1
            </button>
          </div>
          <div className="resource-bonus-row pv-bonus-row">
            <label>Bônus PV</label>
            <input
              type="number"
              className="mini-input"
              disabled={!isMine}
              value={sheet.stats.pvBonus}
              onChange={(e) => setStat("pvBonus", e.target.value)}
            />
          </div>
        </div>

        <div className="resource-box">
          <div className="resource-label">PE</div>
          <div className="resource-bar-wrap">
            <div className="resource-bar">
              <div
                className="resource-fill pe-fill"
                style={{ width: `${Math.max(0, (peAtual / Math.max(1, derived.peMax)) * 100)}%` }}
              />
            </div>
            <div className="resource-bar-text">
              {peAtual} / {derived.peMax}
            </div>
          </div>
          <div className="resource-controls">
            <button type="button" className="btn ghost small" disabled={!isMine} onClick={() => applyDelta("peAtual", -1)}>
              -1
            </button>
            <input
              type="number"
              className="resource-delta-input"
              disabled={!isMine}
              value={sheet.stats.peAtual}
              onChange={(e) => setStat("peAtual", e.target.value)}
            />
            <button type="button" className="btn ghost small" disabled={!isMine} onClick={() => applyDelta("peAtual", 1)}>
              +1
            </button>
          </div>
          <div className="resource-bonus-row">
            <label>Bônus PE</label>
            <input
              type="number"
              className="mini-input"
              disabled={!isMine}
              value={sheet.stats.peBonus}
              onChange={(e) => setStat("peBonus", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-box">
          <div className="val">{derived.armaduraNatural}</div>
          <div className="lbl">Armadura Natural</div>
        </div>
        <div className="stat-box">
          <div className="val">{derived.deslocamento}m</div>
          <div className="lbl">Deslocamento</div>
        </div>
        <div className="stat-box">
          <div className="val">{derived.inventario}</div>
          <div className="lbl">Inventário</div>
        </div>
        <div className="stat-box">
          <div className="val">{derived.critRange}+</div>
          <div className="lbl">Faixa de Crítico</div>
        </div>
        <div className="stat-box">
          <div className="pip-boxes">
            {[0, 1, 2, 3, 4].map((i) => (
              <input
                key={i}
                type="checkbox"
                disabled={!isMine}
                checked={num(sheet.fraturas) > i}
                onChange={() => toggleFratura(i)}
              />
            ))}
          </div>
          <div className="lbl">Fraturas</div>
        </div>
      </div>

      {isMine && (
        <div className="rest-buttons">
          <button type="button" className="btn secondary" onClick={() => setShowRest(true)}>
            😴 Descansar
          </button>
        </div>
      )}

      {showRest && (
        <DescansoDialog
          onCurto={() => rest("curto")}
          onLongo={() => rest("longo")}
          onCancel={() => setShowRest(false)}
        />
      )}
    </div>
  );
}
