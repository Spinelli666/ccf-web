"use client";

import { useState } from "react";
import { num } from "@/lib/derived";
import { AddEquipmentDialog } from "@/components/dialogs/AddEquipmentDialog";
import type { FullSheetData } from "@/lib/sheet-types";

export function EquipmentPanel({
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
  const [showAdd, setShowAdd] = useState(false);

  function removeArma(i: number) {
    onChange({ armas: sheet.armas.filter((_, idx) => idx !== i) });
  }
  function removeArmadura(i: number) {
    onChange({ armaduras: sheet.armaduras.filter((_, idx) => idx !== i) });
  }
  function removeRemedio(i: number) {
    onChange({ remedios: sheet.remedios.filter((_, idx) => idx !== i) });
  }
  function toggleEquipArma(i: number) {
    const next = sheet.armas.slice();
    next[i] = { ...next[i], equipado: !next[i].equipado };
    onChange({ armas: next });
  }
  function toggleEquipArmadura(i: number) {
    const next = sheet.armaduras.slice();
    next[i] = { ...next[i], equipado: !next[i].equipado };
    onChange({ armaduras: next });
  }
  function usarRemedio(i: number) {
    const r = sheet.remedios[i];
    const max = num(r.usosMax, 0);
    if (max > 0 && r.usosGastos >= max) return;
    const next = sheet.remedios.slice();
    next[i] = { ...next[i], usosGastos: r.usosGastos + 1 };
    onChange({ remedios: next });
    onLog(`${sheet.name || "Personagem"} usou "${r.item}" — ${r.efeito}`);
  }

  const armaduraTotal = sheet.armaduras
    .filter((a) => a.equipado)
    .reduce((sum, a) => sum + (num(a.armadura, 0) || 0), 0);

  return (
    <div className="section">
      <div className="sheet-actions">
        <h2>Equipamento</h2>
        {isMine && (
          <button type="button" className="btn secondary" onClick={() => setShowAdd(true)}>
            + Adicionar
          </button>
        )}
      </div>

      <h3 style={{ color: "var(--maroon)", fontFamily: "Cinzel,serif", fontSize: 13 }}>Armas</h3>
      <table className="sheet-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Dano</th>
            <th>Propriedades</th>
            <th>Equipado</th>
            {isMine && <th></th>}
          </tr>
        </thead>
        <tbody>
          {sheet.armas.map((a, i) => (
            <tr key={i}>
              <td className="name">{a.item}</td>
              <td>💥{a.dano}</td>
              <td>{a.propriedades}</td>
              <td>
                <input type="checkbox" checked={a.equipado} disabled={!isMine} onChange={() => toggleEquipArma(i)} />
              </td>
              {isMine && (
                <td>
                  <button type="button" className="remove-btn" onClick={() => removeArma(i)}>
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ color: "var(--maroon)", fontFamily: "Cinzel,serif", fontSize: 13, marginTop: 18 }}>Armaduras</h3>
      <table className="sheet-table">
        <thead>
          <tr>
            <th>Parte</th>
            <th>Item</th>
            <th>Armadura</th>
            <th>Equipado</th>
            {isMine && <th></th>}
          </tr>
        </thead>
        <tbody>
          {sheet.armaduras.map((a, i) => (
            <tr key={i}>
              <td>{a.parte}</td>
              <td className="name">{a.item}</td>
              <td>🛡️{a.armadura}</td>
              <td>
                <input
                  type="checkbox"
                  checked={a.equipado}
                  disabled={!isMine}
                  onChange={() => toggleEquipArmadura(i)}
                />
              </td>
              {isMine && (
                <td>
                  <button type="button" className="remove-btn" onClick={() => removeArmadura(i)}>
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="armor-total">Armadura total equipada: {armaduraTotal}</div>

      <h3 style={{ color: "var(--maroon)", fontFamily: "Cinzel,serif", fontSize: 13, marginTop: 18 }}>Remédios</h3>
      <table className="sheet-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Efeito</th>
            <th>Usos</th>
            {isMine && <th></th>}
          </tr>
        </thead>
        <tbody>
          {sheet.remedios.map((r, i) => {
            const max = num(r.usosMax, 0);
            return (
              <tr key={i}>
                <td className="name">{r.item}</td>
                <td>{r.efeito}</td>
                <td>
                  {isMine ? (
                    <button
                      type="button"
                      className="tag-btn avail"
                      disabled={max > 0 && r.usosGastos >= max}
                      onClick={() => usarRemedio(i)}
                    >
                      Usar {max > 0 ? `(${r.usosGastos}/${max})` : ""}
                    </button>
                  ) : (
                    max > 0 && `${r.usosGastos}/${max}`
                  )}
                </td>
                {isMine && (
                  <td>
                    <button type="button" className="remove-btn" onClick={() => removeRemedio(i)}>
                      ×
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {showAdd && (
        <AddEquipmentDialog
          onCancel={() => setShowAdd(false)}
          onAdd={({ armas, armaduras }) => {
            onChange({
              armas: [
                ...sheet.armas,
                ...armas.map((a) => ({ ...a, durabilidadeAtual: 0, durabilidadeMax: 0 })),
              ],
              armaduras: [
                ...sheet.armaduras,
                ...armaduras.map((a) => ({ ...a, durabilidadeAtual: 0, durabilidadeMax: 0 })),
              ],
            });
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
