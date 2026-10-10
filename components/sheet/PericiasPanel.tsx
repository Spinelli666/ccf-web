"use client";

import { useState } from "react";
import { num, equippedPericiaBonus, habilidadePericiaBonus, PERICIA_ORDER } from "@/lib/derived";
import { rollWithMode, formatRollDice, rollCritClass, type RollModeKey } from "@/lib/dice";
import { ChoiceDialog } from "@/components/dialogs/ChoiceDialog";
import { getSocket } from "@/lib/socket-client";
import { getRollVisibility } from "@/lib/roll-visibility";
import type { FullSheetData, Pericia } from "@/lib/sheet-types";

export function PericiasPanel({
  sheet,
  isMine,
  onChange,
  mesaId,
  isPrivate,
}: {
  sheet: FullSheetData;
  isMine: boolean;
  onChange: (patch: Partial<FullSheetData>) => void;
  mesaId: string;
  isPrivate: boolean;
}) {
  const [rollingIdx, setRollingIdx] = useState<number | null>(null);
  // Perícia sendo editada: o losango mostra só o valor base enquanto está em foco.
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);

  const ordemExibicao = [
    ...PERICIA_ORDER.map((nome) =>
      sheet.pericias.findIndex((p) => p.nome.trim().toLowerCase() === nome.toLowerCase())
    ).filter((i) => i !== -1),
    ...sheet.pericias
      .map((_, i) => i)
      .filter((i) => !PERICIA_ORDER.some((nome) => nome.toLowerCase() === sheet.pericias[i].nome.trim().toLowerCase())),
  ];

  function setPericia(i: number, field: keyof Pericia, value: string) {
    const next = sheet.pericias.slice();
    next[i] = { ...next[i], [field]: value };
    onChange({ pericias: next });
  }

  function doRoll(mode: RollModeKey, bonusExtra: number) {
    if (rollingIdx === null) return;
    const p = sheet.pericias[rollingIdx];
    const periciaBonus = num(p.bonus, 0);
    const equipBonus = equippedPericiaBonus(sheet.armaduras, sheet.armas, p.nome);
    const habBonus = habilidadePericiaBonus(sheet.classeHabilidades, p.nome);
    const result = rollWithMode(20, mode);
    const total = result.picked + num(p.valor) + periciaBonus + equipBonus + habBonus + bonusExtra;
    let breakdown = `${p.nome}: ${formatRollDice(20, result)} + ${num(p.valor)}`;
    if (periciaBonus) breakdown += ` + Bônus (${periciaBonus})`;
    if (equipBonus) breakdown += ` + Equipamento (${equipBonus})`;
    if (habBonus) breakdown += ` + Habilidade (${habBonus})`;
    if (bonusExtra) breakdown += ` ${bonusExtra > 0 ? "+" : "-"} ${Math.abs(bonusExtra)}`;
    getSocket(mesaId).emit("chat:send", {
      kind: "roll",
      text: `🎲 ${breakdown}`,
      total,
      critClass: rollCritClass(result.picked),
      characterName: sheet.name,
      characterAvatarUrl: sheet.avatarUrl || undefined,
      isPrivate,
      visibility: getRollVisibility(),
    });
    setRollingIdx(null);
  }

  return (
    <div className="section">
      <h2>Perícias</h2>
      <div className="pericias-grid">
        {ordemExibicao.map((i) => {
          const p = sheet.pericias[i];
          // Losango: total (base + bônus de itens/habilidades); ao clicar, edita só a base.
          const bonusAuto =
            equippedPericiaBonus(sheet.armaduras, sheet.armas, p.nome) + habilidadePericiaBonus(sheet.classeHabilidades, p.nome);
          const total = num(p.valor) + bonusAuto;
          const editando = editandoIdx === i;
          return (
            <div key={i} className="pericia-row">
              <span className="pericia-losango">
                {isMine ? (
                  <input
                    type="number"
                    title={bonusAuto ? `Valor base ${num(p.valor)} + ${bonusAuto} de itens/habilidades` : "Valor da perícia"}
                    value={editando ? p.valor : String(total)}
                    onFocus={(e) => {
                      setEditandoIdx(i);
                      requestAnimationFrame(() => e.target.select());
                    }}
                    onBlur={() => setEditandoIdx(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    onChange={(e) => setPericia(i, "valor", e.target.value)}
                  />
                ) : (
                  <span>{total}</span>
                )}
              </span>
              <span className="n">{p.nome}</span>
              <span className="pericia-right">
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
          );
        })}
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
