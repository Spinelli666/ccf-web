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
}: {
  sheet: FullSheetData;
  isMine: boolean;
  onChange: (patch: Partial<FullSheetData>) => void;
}) {
  const [rollingIdx, setRollingIdx] = useState<number | null>(null);

  function setPericia(i: number, field: keyof Pericia, value: string) {
    const next = sheet.pericias.slice();
    next[i] = { ...next[i], [field]: value };
    onChange({ pericias: next });
  }

  function doRoll(mode: RollModeKey, bonus: number) {
    if (rollingIdx === null) return;
    const p = sheet.pericias[rollingIdx];
    const result = rollWithMode(20, mode);
    const total = result.picked + num(p.valor) + bonus;
    const breakdown = `${p.nome}: ${formatRollDice(20, result)} + ${num(p.valor)}${bonus ? ` + ${bonus}` : ""}`;
    getSocket().emit("chat:send", {
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
