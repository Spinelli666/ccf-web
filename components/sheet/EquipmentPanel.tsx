"use client";

import { Fragment, useState } from "react";
import { computeDerived, equippedArmorSum, num, clamp } from "@/lib/derived";
import { rollWithMode, formatRollDice, type RollModeKey } from "@/lib/dice";
import { getSocket } from "@/lib/socket-client";
import { ChoiceDialog } from "@/components/dialogs/ChoiceDialog";
import { AddEquipmentDialog } from "@/components/dialogs/AddEquipmentDialog";
import { PROPRIEDADES_ARMAS_INFO } from "@/data/weapons";
import type { Arma, Armadura, FullSheetData } from "@/lib/sheet-types";

const ATRIBUTOS_ATAQUE = ["Força", "Destreza", "Psionismo"] as const;

const PESO_LABELS: Record<string, string> = { leve: "Leve", medio: "Médio", pesado: "Pesado", mpesado: "M. Pesado" };
const PESO_SPACE: Record<string, number> = { leve: 0, medio: 1, pesado: 2, mpesado: 4 };
function pesoDe(a: { peso?: string }): string {
  return a.peso && PESO_LABELS[a.peso] ? a.peso : "medio";
}

function explicarPropriedades(propStr: string): { nome: string; desc: string }[] {
  if (!propStr || propStr === "—") return [];
  return propStr
    .split("·")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const nomeBase = p.replace(/\s*\d+\s*$/, "").trim();
      return {
        nome: p,
        desc: (PROPRIEDADES_ARMAS_INFO as Record<string, string>)[nomeBase] || "Sem descrição cadastrada.",
      };
    });
}

export function EquipmentPanel({
  sheet,
  isMine,
  onChange,
  onLog,
  mesaId,
}: {
  sheet: FullSheetData;
  isMine: boolean;
  onChange: (patch: Partial<FullSheetData>) => void;
  onLog: (text: string) => void;
  mesaId: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [attackIdx, setAttackIdx] = useState<number | null>(null);
  const [attrByIdx, setAttrByIdx] = useState<Record<number, string>>({});

  const derived = computeDerived(sheet);
  const atributoOpts = ATRIBUTOS_ATAQUE.map((nome) => {
    const p = sheet.pericias.find((pp) => pp.nome.trim().toLowerCase() === nome.toLowerCase());
    return { nome, valor: p ? num(p.valor) : 0 };
  });

  function toggleEquipArma(i: number) {
    const next = sheet.armas.slice();
    next[i] = { ...next[i], equipado: !next[i].equipado };
    onChange({ armas: next });
    onLog(`${sheet.name || "Personagem"} ${next[i].equipado ? "equipou" : "guardou"} "${next[i].item}"`);
  }
  function toggleEquipArmadura(i: number) {
    const next = sheet.armaduras.slice();
    next[i] = { ...next[i], equipado: !next[i].equipado };
    onChange({ armaduras: next });
    onLog(`${sheet.name || "Personagem"} ${next[i].equipado ? "equipou" : "guardou"} "${next[i].item}"`);
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

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function adjustDurabilidade(kind: "armas" | "armaduras", i: number, delta: number) {
    const list = sheet[kind].slice();
    const item = list[i];
    list[i] = { ...item, durabilidadeAtual: clamp(item.durabilidadeAtual + delta, 0, item.durabilidadeMax) };
    onChange({ [kind]: list } as Partial<FullSheetData>);
  }

  function doAttack(mode: RollModeKey) {
    if (attackIdx === null) return;
    const idx = attackIdx;
    const a = sheet.armas[idx];
    const attrOpt = atributoOpts.find((o) => o.nome === attrByIdx[idx]);
    const rollInfo = rollWithMode(20, mode);
    const natural = rollInfo.picked;
    const isCrit = natural >= derived.critRange;
    const isFumble = natural === 1;
    const rawDano = parseFloat(a.dano);
    let danoFinal: number | null = isNaN(rawDano) ? null : rawDano;
    if (danoFinal !== null && isCrit) danoFinal *= 2;

    let text = attrOpt
      ? `🗡️ Atacou com "${a.item}" (${formatRollDice(20, rollInfo)} + ${attrOpt.nome} ${attrOpt.valor})`
      : `🗡️ Atacou com "${a.item}" (${formatRollDice(20, rollInfo)})`;
    if (danoFinal !== null) text += ` — Dano: ${danoFinal}${isCrit ? " (⭐ CRÍTICO, dobrado!)" : ""}`;
    text += ` — Propriedades: ${a.propriedades || "—"}`;

    if (isFumble) {
      const next = sheet.armas.slice();
      next[idx] = { ...next[idx], durabilidadeAtual: clamp(next[idx].durabilidadeAtual - 1, 0, next[idx].durabilidadeMax) };
      onChange({ armas: next });
      text += ` — ⚠ ERRO CRÍTICO! -1 Durabilidade (${next[idx].durabilidadeAtual}/${next[idx].durabilidadeMax})`;
    }

    getSocket(mesaId).emit("chat:send", {
      kind: "roll",
      text,
      total: danoFinal ?? undefined,
      critClass: isFumble ? "roll-crit-low" : isCrit ? "roll-crit-high" : "",
      characterName: sheet.name,
    });
    setAttackIdx(null);
  }

  const armas = sheet.armas.map((a, i) => [i, a] as const).filter(([, a]) => a.item);
  const armasEquipadas = armas.filter(([, a]) => a.equipado);
  const armasInventario = armas.filter(([, a]) => !a.equipado);
  const armaduras = sheet.armaduras.map((a, i) => [i, a] as const).filter(([, a]) => a.item);
  const armadurasEquipadas = armaduras.filter(([, a]) => a.equipado);
  const armadurasInventario = armaduras.filter(([, a]) => !a.equipado);
  const remedioPairs = sheet.remedios.map((r, i) => [i, r] as const).filter(([, r]) => r.item);

  const armaduraBonus = num(sheet.armaduraBonusManual, 0);
  const armaduraMaximo = derived.armaduraNatural + equippedArmorSum(sheet.armaduras) + armaduraBonus;
  const armaduraAtual =
    sheet.armaduraAtual === null || sheet.armaduraAtual === undefined
      ? armaduraMaximo
      : clamp(num(sheet.armaduraAtual), 0, armaduraMaximo);

  const equipHtmlVisible = armasEquipadas.length > 0 || armadurasEquipadas.length > 0;
  const inventarioHtmlVisible = armasInventario.length > 0 || armadurasInventario.length > 0 || remedioPairs.length > 0;

  let slotsLeveCount = 0;
  let slotsFixos = 0;
  [...armasInventario, ...armadurasInventario, ...remedioPairs].forEach(([, item]) => {
    const p = pesoDe(item);
    if (p === "leve") slotsLeveCount++;
    else slotsFixos += PESO_SPACE[p];
  });
  const slotsUsados = slotsFixos + Math.floor(slotsLeveCount / 10);
  const invMax = derived.inventario;

  function weaponPropsRow(idx: number, a: Arma, key: string, colSpan: number) {
    const props = explicarPropriedades(a.propriedades);
    return (
      expanded.has(key) && (
        <tr className="item-info-row" key={`${key}-props`}>
          <td colSpan={colSpan}>
            <div className="item-info-box">
              <div className="item-info-line">
                <b>Preço:</b> {a.preco || "—"}
              </div>
              {props.length ? (
                props.map((p) => (
                  <div className="item-info-line" key={p.nome}>
                    <b>{p.nome}</b> — {p.desc}
                  </div>
                ))
              ) : (
                <div className="item-info-line">
                  <em>Sem propriedades especiais.</em>
                </div>
              )}
            </div>
          </td>
        </tr>
      )
    );
  }

  function armorInfoRow(idx: number, a: Armadura, key: string, colSpan: number) {
    return (
      expanded.has(key) && (
        <tr className="item-info-row" key={`${key}-info`}>
          <td colSpan={colSpan}>
            <div className="item-info-box">
              <div className="item-info-line">
                <b>Parte do corpo:</b> {a.parte || "—"}
              </div>
              <div className="item-info-line">
                <b>Preço:</b> {a.preco || "—"}
              </div>
            </div>
          </td>
        </tr>
      )
    );
  }

  return (
    <>
      {isMine && (
        <button type="button" className="add-row-btn" style={{ marginBottom: 14 }} onClick={() => setShowAdd(true)}>
          + Adicionar Equipamento
        </button>
      )}

      {equipHtmlVisible && (
        <div className="section">
          <h2>Equipamento</h2>
          {armasEquipadas.length > 0 && (
            <div className="sheet-table-wrap">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Dano</th>
                    <th>Durab.</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {armasEquipadas.map(([idx, a]) => (
                    <Fragment key={idx}>
                      <tr>
                        <td className="name">
                          <button type="button" className="item-name-btn" onClick={() => toggleExpanded(`w-${idx}`)}>
                            {a.item}
                          </button>
                        </td>
                        <td>{a.dano}</td>
                        <td>
                          <div className="counter">
                            <button type="button" className="counter-btn" disabled={!isMine} onClick={() => adjustDurabilidade("armas", idx, -1)}>
                              −
                            </button>
                            <span className="counter-val">
                              {a.durabilidadeAtual}/{a.durabilidadeMax}
                            </span>
                            <button type="button" className="counter-btn" disabled={!isMine} onClick={() => adjustDurabilidade("armas", idx, 1)}>
                              +
                            </button>
                          </div>
                        </td>
                        <td>
                          {isMine && (
                            <div className="attack-cell">
                              <select
                                className="attr-select"
                                value={attrByIdx[idx] || ""}
                                onChange={(e) => setAttrByIdx((prev) => ({ ...prev, [idx]: e.target.value }))}
                              >
                                <option value="">Nenhum atributo</option>
                                {atributoOpts.map((o) => (
                                  <option key={o.nome} value={o.nome}>
                                    {o.nome} ({o.valor})
                                  </option>
                                ))}
                              </select>
                              <button type="button" className="btn small secondary" onClick={() => setAttackIdx(idx)}>
                                Atacar
                              </button>
                            </div>
                          )}
                        </td>
                        <td>
                          {isMine && (
                            <button type="button" className="btn ghost small" onClick={() => toggleEquipArma(idx)}>
                              Desequipar
                            </button>
                          )}
                        </td>
                      </tr>
                      {weaponPropsRow(idx, a, `w-${idx}`, 5)}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {armadurasEquipadas.length > 0 ? (
            <>
              <div className="sheet-table-wrap">
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Armadura</th>
                      <th>Durab.</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {armadurasEquipadas.map(([idx, a]) => (
                      <Fragment key={idx}>
                        <tr>
                          <td className="name">
                            <button type="button" className="item-name-btn" onClick={() => toggleExpanded(`a-${idx}`)}>
                              {a.item}
                            </button>
                          </td>
                          <td>{a.armadura}</td>
                          <td>
                            <div className="counter">
                              <button type="button" className="counter-btn" disabled={!isMine} onClick={() => adjustDurabilidade("armaduras", idx, -1)}>
                                −
                              </button>
                              <span className="counter-val">
                                {a.durabilidadeAtual}/{a.durabilidadeMax}
                              </span>
                              <button type="button" className="counter-btn" disabled={!isMine} onClick={() => adjustDurabilidade("armaduras", idx, 1)}>
                                +
                              </button>
                            </div>
                          </td>
                          <td>
                            {isMine && (
                              <button type="button" className="btn ghost small" onClick={() => toggleEquipArmadura(idx)}>
                                Desequipar
                              </button>
                            )}
                          </td>
                        </tr>
                        {armorInfoRow(idx, a, `a-${idx}`, 4)}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="armor-total">
                Armadura: {armaduraAtual} / {armaduraMaximo}
                {derived.armaduraNatural ? ` (inclui ${derived.armaduraNatural} natural)` : ""}
              </div>
            </>
          ) : (
            <div className="derived-note">
              Nenhuma armadura equipada. Armadura: {armaduraAtual} / {armaduraMaximo} (só natural
              {armaduraBonus ? " + bônus" : ""}).
            </div>
          )}
        </div>
      )}

      {inventarioHtmlVisible && (
        <div className="section">
          <h2>Inventário</h2>
          {armasInventario.length > 0 && (
            <div className="sheet-table-wrap">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th>Arma</th>
                    <th>Dano</th>
                    <th>Peso</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {armasInventario.map(([idx, a]) => (
                    <Fragment key={idx}>
                      <tr>
                        <td className="name">
                          <button type="button" className="item-name-btn" onClick={() => toggleExpanded(`wi-${idx}`)}>
                            {a.item}
                          </button>
                        </td>
                        <td>{a.dano}</td>
                        <td>{PESO_LABELS[pesoDe(a)]}</td>
                        <td>
                          {isMine && (
                            <button type="button" className="btn small secondary" onClick={() => toggleEquipArma(idx)}>
                              Equipar
                            </button>
                          )}
                        </td>
                      </tr>
                      {weaponPropsRow(idx, a, `wi-${idx}`, 4)}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {armadurasInventario.length > 0 && (
            <div className="sheet-table-wrap">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Armadura</th>
                    <th>Peso</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {armadurasInventario.map(([idx, a]) => (
                    <Fragment key={idx}>
                      <tr>
                        <td className="name">
                          <button type="button" className="item-name-btn" onClick={() => toggleExpanded(`ai-${idx}`)}>
                            {a.item}
                          </button>
                        </td>
                        <td>{a.armadura}</td>
                        <td>{PESO_LABELS[pesoDe(a)]}</td>
                        <td>
                          {isMine && (
                            <button type="button" className="btn small secondary" onClick={() => toggleEquipArmadura(idx)}>
                              Equipar
                            </button>
                          )}
                        </td>
                      </tr>
                      {armorInfoRow(idx, a, `ai-${idx}`, 4)}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {remedioPairs.length > 0 && (
            <div className="sheet-table-wrap">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Efeito</th>
                    <th>Peso</th>
                    <th>Preço</th>
                    <th>Usos</th>
                  </tr>
                </thead>
                <tbody>
                  {remedioPairs.map(([idx, r]) => {
                    const max = num(r.usosMax, 0);
                    return (
                      <tr key={idx}>
                        <td className="name">{r.item}</td>
                        <td>{r.efeito}</td>
                        <td>{PESO_LABELS[pesoDe(r)]}</td>
                        <td>{r.preco}</td>
                        <td>
                          {max > 0 && <span className="uses-count">{r.usosGastos}/{max}</span>}{" "}
                          {isMine && (
                            <button
                              type="button"
                              className="btn small secondary"
                              disabled={max > 0 && r.usosGastos >= max}
                              onClick={() => usarRemedio(idx)}
                            >
                              Usar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!equipHtmlVisible && !inventarioHtmlVisible && (
        <div className="derived-note">Nada em Equipamento ou Inventário ainda.</div>
      )}

      <div className="resumo">
        <div className="box">
          <div className="val">
            {slotsUsados}
            {invMax ? ` / ${invMax}` : ""}
          </div>
          <div className="lbl">Espaços de Inventário</div>
        </div>
      </div>

      {showAdd && (
        <AddEquipmentDialog
          onCancel={() => setShowAdd(false)}
          onAdd={({ armas: novasArmas, armaduras: novasArmaduras, remedios: novosRemedios }) => {
            onChange({
              armas: [
                ...sheet.armas,
                ...novasArmas.map((a) => ({ ...a, durabilidadeAtual: 3, durabilidadeMax: 3 })),
              ],
              armaduras: [
                ...sheet.armaduras,
                ...novasArmaduras.map((a) => ({ ...a, durabilidadeAtual: 3, durabilidadeMax: 3 })),
              ],
              remedios: [...sheet.remedios, ...novosRemedios],
            });
            const nomes = [...novasArmas.map((a) => a.item), ...novasArmaduras.map((a) => a.item), ...novosRemedios.map((r) => r.item)].join(
              ", "
            );
            onLog(`${sheet.name || "Personagem"} adicionou ao Inventário: ${nomes}`);
            setShowAdd(false);
          }}
        />
      )}

      {attackIdx !== null && (
        <ChoiceDialog
          title={`Atacar com "${sheet.armas[attackIdx].item}" — como?`}
          onSelect={(mode) => doAttack(mode)}
          onCancel={() => setAttackIdx(null)}
        />
      )}
    </>
  );
}
