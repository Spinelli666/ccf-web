"use client";

import { useState } from "react";
import { num } from "@/lib/derived";
import { rollWithMode, formatRollDice, rollCritClass, type RollModeKey } from "@/lib/dice";
import { ChoiceDialog } from "@/components/dialogs/ChoiceDialog";
import { getSocket } from "@/lib/socket-client";
import type { FullSheetData, Pericia } from "@/lib/sheet-types";

export function PericiasPanel({
  sheet,
  isMine,
  onChange,
  mesaId,
}: {
  sheet: FullSheetData;
  isMine: boolean;
  onChange: (patch: Partial<FullSheetData>) => void;
  mesaId: string;
}) {
  const [rollingIdx, setRollingIdx] = useState<number | null>(null);

  function setPericia(i: number, field: keyof Pericia, value: string) {
    const next = sheet.pericias.slice();
    next[i] = { ...next[i], [field]: value };
    onChange({ pericias: next });
  }

  function doRoll(mode: RollModeKey, bonusExtra: number) {
    if (rollingIdx === null) return;
    const p = sheet.pericias[rollingIdx];
    const periciaBonus = num(p.bonus, 0);
    const result = rollWithMode(20, mode);
    const total = result.picked + num(p.valor) + periciaBonus + bonusExtra;
    let breakdown = `${p.nome}: ${formatRollDice(20, result)} + ${num(p.valor)}`;
    if (periciaBonus) breakdown += ` + Bônus (${periciaBonus})`;
    if (bonusExtra) breakdown += ` ${bonusExtra > 0 ? "+" : "-"} ${Math.abs(bonusExtra)}`;
    getSocket(mesaId).emit("chat:send", {
      kind: "roll",
      text: breakdown,
      total,
      critClass: rollCritClass(result.picked),
      characterName: sheet.name,
    });
    setRollingIdx(null);
  }

  return (
    <div className="section">
      <h2>Perícias</h2>
      <div className="pericias-grid">
        {sheet.pericias.map((p, i) => (
          <div key={i} className={`pericia-row ${num(p.valor) === 0 ? "zero" : ""}`}>
            <span className="n">{p.nome}</span>
            <span className="pericia-right">
              {isMine ? (
                <input
                  type="number"
                  className="mini-input"
                  value={p.valor}
                  onChange={(e) => setPericia(i, "valor", e.target.value)}
                />
              ) : (
                <span className="v">{p.valor}</span>
              )}
              <input
                type="number"
                className="mini-input pericia-bonus-input"
                disabled={!isMine}
                value={p.bonus || "0"}
                title="Bônus da perícia (editável — soma ao rolar)"
                onChange={(e) => setPericia(i, "bonus", e.target.value.trim() || "0")}
              />
              <button
                type="button"
                className="dice-btn"
                title={`Rolar d20 + ${p.nome}`}
                onClick={() => setRollingIdx(i)}
              >
                🎲
              </button>
            </span>
          </div>
        ))}
      </div>

      {rollingIdx !== null && (
        <ChoiceDialog
          title={`Rolar ${sheet.pericias[rollingIdx].nome}`}
          includeBonus
          onSelect={doRoll}
          onCancel={() => setRollingIdx(null)}
        />
      )}
    </div>
  );
}
