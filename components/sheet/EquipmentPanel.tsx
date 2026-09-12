"use client";

import { Fragment, useState } from "react";
import { computeDerived, equippedArmorSum, num, clamp } from "@/lib/derived";
import { rollWithMode, formatRollDice, type RollModeKey } from "@/lib/dice";
import { getSocket } from "@/lib/socket-client";
import { ChoiceDialog } from "@/components/dialogs/ChoiceDialog";
import { AddEquipmentDialog } from "@/components/dialogs/AddEquipmentDialog";
import { EditItemDialog, type EditTarget } from "@/components/dialogs/EditItemDialog";
import { PROPRIEDADES_ARMAS_INFO } from "@/data/weapons";
import type { Arma, Armadura, Remedio, FullSheetData } from "@/lib/sheet-types";

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
  isPrivate,
}: {
  sheet: FullSheetData;
  isMine: boolean;
  onChange: (patch: Partial<FullSheetData>) => void;
  onLog: (text: string) => void;
  mesaId: string;
  isPrivate: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openTables, setOpenTables] = useState<Set<string>>(new Set());
  const [attackIdx, setAttackIdx] = useState<number | null>(null);
  const [attrByIdx, setAttrByIdx] = useState<Record<number, string>>({});
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const derived = computeDerived(sheet);
  const atributoOpts = ATRIBUTOS_ATAQUE.map((nome) => {
    const p = sheet.pericias.find((pp) => pp.nome.trim().toLowerCase() === nome.toLowerCase());
    return { nome, valor: p ? num(p.valor) : 0 };
  });

  function qtdDe(item: { quantidade?: string }): number {
    return item.quantidade === undefined ? 1 : Math.max(0, num(item.quantidade, 0));
  }

  function equiparArma(i: number) {
    const item = sheet.armas[i];
    const qtd = qtdDe(item);
    if (qtd <= 0) return;
    const next = sheet.armas.slice();
    if (qtd > 1) {
      next[i] = { ...item, quantidade: String(qtd - 1) };
      next.push({ ...item, equipado: true, quantidade: undefined });
    } else {
      next[i] = { ...item, equipado: true, quantidade: undefined };
    }
    onChange({ armas: next });
    onLog(`${sheet.name || "Personagem"} equipou "${item.item}"`);
  }

  function desequiparArma(i: number) {
    const item = sheet.armas[i];
    const next = sheet.armas.slice();
    const matchIdx = next.findIndex(
      (a, j) =>
        j !== i &&
        !a.equipado &&
        a.item === item.item &&
        a.dano === item.dano &&
        a.propriedades === item.propriedades &&
        a.preco === item.preco &&
        (a.peso || "medio") === (item.peso || "medio")
    );
    if (matchIdx >= 0) {
      next[matchIdx] = { ...next[matchIdx], quantidade: String(qtdDe(next[matchIdx]) + 1) };
      next.splice(i, 1);
    } else {
      next[i] = { ...item, equipado: false, quantidade: "1" };
    }
    onChange({ armas: next });
    onLog(`${sheet.name || "Personagem"} guardou "${item.item}"`);
  }

  function equiparArmadura(i: number) {
    const item = sheet.armaduras[i];
    const qtd = qtdDe(item);
    if (qtd <= 0) return;
    const next = sheet.armaduras.slice();
    if (qtd > 1) {
      next[i] = { ...item, quantidade: String(qtd - 1) };
      next.push({ ...item, equipado: true, quantidade: undefined });
    } else {
      next[i] = { ...item, equipado: true, quantidade: undefined };
    }
    onChange({ armaduras: next });
    onLog(`${sheet.name || "Personagem"} equipou "${item.item}"`);
  }

  function desequiparArmadura(i: number) {
    const item = sheet.armaduras[i];
    const next = sheet.armaduras.slice();
    const matchIdx = next.findIndex(
      (a, j) =>
        j !== i &&
        !a.equipado &&
        a.item === item.item &&
        a.parte === item.parte &&
        a.armadura === item.armadura &&
        a.preco === item.preco &&
        (a.peso || "medio") === (item.peso || "medio")
    );
    if (matchIdx >= 0) {
      next[matchIdx] = { ...next[matchIdx], quantidade: String(qtdDe(next[matchIdx]) + 1) };
      next.splice(i, 1);
    } else {
      next[i] = { ...item, equipado: false, quantidade: "1" };
    }
    onChange({ armaduras: next });
    onLog(`${sheet.name || "Personagem"} guardou "${item.item}"`);
  }

  function setQuantidadeItem(kind: "armas" | "armaduras", i: number, value: string) {
    const list = sheet[kind].slice();
    const n = Math.max(0, parseInt(value, 10) || 0);
    list[i] = { ...list[i], quantidade: String(n) };
    onChange({ [kind]: list } as Partial<FullSheetData>);
  }

  function setQuantidade(i: number, value: string) {
    const next = sheet.remedios.slice();
    const n = Math.max(0, parseInt(value, 10) || 0);
    next[i] = { ...next[i], quantidade: String(n) };
    onChange({ remedios: next });
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

  function toggleTable(key: string) {
    setOpenTables((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function tableHead(key: string, label: string, count: number) {
    const open = openTables.has(key);
    return (
      <button type="button" className="table-collapse-head" onClick={() => toggleTable(key)}>
        <span className="table-collapse-arrow">{open ? "▾" : "▸"}</span> {label}{" "}
        <span className="table-collapse-count">({count})</span>
      </button>
    );
  }

  function setDurabilidadeAtual(kind: "armas" | "armaduras", i: number, value: string) {
    const list = sheet[kind].slice();
    const item = list[i];
    const n = clamp(parseInt(value, 10) || 0, 0, item.durabilidadeMax);
    list[i] = { ...item, durabilidadeAtual: n };
    onChange({ [kind]: list } as Partial<FullSheetData>);
  }

  function durabField(kind: "armas" | "armaduras", idx: number, item: Arma | Armadura) {
    return (
      <div className="durab-field">
        <input
          type="number"
          className="durab-input"
          min={0}
          max={item.durabilidadeMax}
          value={item.durabilidadeAtual}
          disabled={!isMine}
          onChange={(e) => setDurabilidadeAtual(kind, idx, e.target.value)}
        />
        <span className="durab-sep">|</span>
        <input type="number" className="durab-input durab-max" value={item.durabilidadeMax} disabled readOnly title="Durabilidade máxima — ajuste em Editar" />
      </div>
    );
  }

  function salvarEdicao(patch: Partial<Arma> | Partial<Armadura> | Partial<Remedio>) {
    if (!editTarget) return;
    if (editTarget.tipo === "arma") {
      const next = sheet.armas.slice();
      next[editTarget.idx] = { ...next[editTarget.idx], ...(patch as Partial<Arma>) };
      onChange({ armas: next });
    } else if (editTarget.tipo === "armadura") {
      const next = sheet.armaduras.slice();
      next[editTarget.idx] = { ...next[editTarget.idx], ...(patch as Partial<Armadura>) };
      onChange({ armaduras: next });
    } else {
      const next = sheet.remedios.slice();
      next[editTarget.idx] = { ...next[editTarget.idx], ...(patch as Partial<Remedio>) };
      onChange({ remedios: next });
    }
    setEditTarget(null);
  }

  function removerItemEditado() {
    if (!editTarget) return;
    const nome = editTarget.data.item;
    if (editTarget.tipo === "arma") {
      onChange({ armas: sheet.armas.filter((_, i) => i !== editTarget.idx) });
    } else if (editTarget.tipo === "armadura") {
      onChange({ armaduras: sheet.armaduras.filter((_, i) => i !== editTarget.idx) });
    } else {
      onChange({ remedios: sheet.remedios.filter((_, i) => i !== editTarget.idx) });
    }
    onLog(`${sheet.name || "Personagem"} removeu "${nome}" do Inventário.`);
    setEditTarget(null);
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
      isPrivate,
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
  [...armasInventario, ...armadurasInventario].forEach(([, item]) => {
    const qtd = qtdDe(item);
    const p = pesoDe(item);
    if (p === "leve") slotsLeveCount += qtd;
    else slotsFixos += PESO_SPACE[p] * qtd;
  });
  remedioPairs.forEach(([, r]) => {
    // Itens Genéricos (sem Usos) empilham quantidade — cada cópia ocupa espaço.
    // Remédios com Usos limitados continuam contando como 1, igual sempre foi.
    const qtd = num(r.usosMax, 0) > 0 ? 1 : Math.max(1, num(r.quantidade, 1));
    const p = pesoDe(r);
    if (p === "leve") slotsLeveCount += qtd;
    else slotsFixos += PESO_SPACE[p] * qtd;
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

  function genericoInfoRow(idx: number, r: Remedio, key: string, colSpan: number) {
    return (
      expanded.has(key) && (
        <tr className="item-info-row" key={`${key}-info`}>
          <td colSpan={colSpan}>
            <div className="item-info-box">
              {r.efeito ? (
                <div className="item-info-line">{r.efeito}</div>
              ) : (
                <div className="item-info-line">
                  <em>Sem descrição — edite pelo ✏️ pra adicionar.</em>
                </div>
              )}
            </div>
          </td>
        </tr>
      )
    );
  }

  return (
    <>
      <div className="resumo">
        <div className="box">
          <div className="val">
            {slotsUsados}
            {invMax ? ` / ${invMax}` : ""}
          </div>
          <div className="lbl">Espaços de Inventário</div>
        </div>
      </div>

      {isMine && (
        <button type="button" className="add-row-btn" style={{ marginBottom: 14 }} onClick={() => setShowAdd(true)}>
          + Adicionar Equipamento
        </button>
      )}

      {equipHtmlVisible && (
        <div className="section">
          <h2>Equipamento</h2>
          {armasEquipadas.length > 0 && (
            <>
              {tableHead("eq-armas", "Armas Equipadas", armasEquipadas.length)}
              {openTables.has("eq-armas") && (
              <div className="sheet-table-wrap">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Dano</th>
                    <th>Durab.</th>
                    <th></th>
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
                        <td className="col-tight">{a.dano}</td>
                        <td className="col-tight">{durabField("armas", idx, a)}</td>
                        <td className="col-tight">
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
                        <td className="col-tight">
                          {isMine && (
                            <button type="button" className="btn ghost small" onClick={() => desequiparArma(idx)}>
                              Desequipar
                            </button>
                          )}
                        </td>
                        <td className="col-tight">
                          {isMine && (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Editar"
                              onClick={() => setEditTarget({ tipo: "arma", idx, data: a })}
                            >
                              ✏️
                            </button>
                          )}
                        </td>
                      </tr>
                      {weaponPropsRow(idx, a, `w-${idx}`, 6)}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              </div>
              )}
            </>
          )}

          {armadurasEquipadas.length > 0 ? (
            <>
              {tableHead("eq-armaduras", "Armaduras Equipadas", armadurasEquipadas.length)}
              {openTables.has("eq-armaduras") && (
              <div className="sheet-table-wrap">
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Armadura</th>
                      <th>Durab.</th>
                      <th></th>
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
                          <td className="col-tight">{a.armadura}</td>
                          <td className="col-tight">{durabField("armaduras", idx, a)}</td>
                          <td className="col-tight">
                            {isMine && (
                              <button type="button" className="btn ghost small" onClick={() => desequiparArmadura(idx)}>
                                Desequipar
                              </button>
                            )}
                          </td>
                          <td className="col-tight">
                            {isMine && (
                              <button
                                type="button"
                                className="icon-btn"
                                title="Editar"
                                onClick={() => setEditTarget({ tipo: "armadura", idx, data: a })}
                              >
                                ✏️
                              </button>
                            )}
                          </td>
                        </tr>
                        {armorInfoRow(idx, a, `a-${idx}`, 5)}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
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
            <>
              {tableHead("inv-armas", "Armas", armasInventario.length)}
              {openTables.has("inv-armas") && (
              <div className="sheet-table-wrap">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th>Arma</th>
                    <th>Dano</th>
                    <th>Peso</th>
                    <th>Qtd</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {armasInventario.map(([idx, a]) => {
                    const qtd = qtdDe(a);
                    return (
                    <Fragment key={idx}>
                      <tr>
                        <td className="name">
                          <button type="button" className="item-name-btn" onClick={() => toggleExpanded(`wi-${idx}`)}>
                            {a.item}
                          </button>
                        </td>
                        <td className="col-tight">{a.dano}</td>
                        <td className="col-tight">{PESO_LABELS[pesoDe(a)]}</td>
                        <td className="col-tight">
                          {isMine ? (
                            <input
                              type="number"
                              className="qty-input"
                              min={0}
                              value={qtd}
                              onChange={(e) => setQuantidadeItem("armas", idx, e.target.value)}
                            />
                          ) : (
                            qtd
                          )}
                        </td>
                        <td className="col-tight">
                          {isMine && (
                            <button type="button" className="btn small secondary" disabled={qtd <= 0} onClick={() => equiparArma(idx)}>
                              Equipar
                            </button>
                          )}
                        </td>
                        <td className="col-tight">
                          {isMine && (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Editar"
                              onClick={() => setEditTarget({ tipo: "arma", idx, data: a })}
                            >
                              ✏️
                            </button>
                          )}
                        </td>
                      </tr>
                      {weaponPropsRow(idx, a, `wi-${idx}`, 6)}
                    </Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
              )}
            </>
          )}

          {armadurasInventario.length > 0 && (
            <>
              {tableHead("inv-armaduras", "Armaduras", armadurasInventario.length)}
              {openTables.has("inv-armaduras") && (
              <div className="sheet-table-wrap">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Armadura</th>
                    <th>Peso</th>
                    <th>Qtd</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {armadurasInventario.map(([idx, a]) => {
                    const qtd = qtdDe(a);
                    return (
                    <Fragment key={idx}>
                      <tr>
                        <td className="name">
                          <button type="button" className="item-name-btn" onClick={() => toggleExpanded(`ai-${idx}`)}>
                            {a.item}
                          </button>
                        </td>
                        <td className="col-tight">{a.armadura}</td>
                        <td className="col-tight">{PESO_LABELS[pesoDe(a)]}</td>
                        <td className="col-tight">
                          {isMine ? (
                            <input
                              type="number"
                              className="qty-input"
                              min={0}
                              value={qtd}
                              onChange={(e) => setQuantidadeItem("armaduras", idx, e.target.value)}
                            />
                          ) : (
                            qtd
                          )}
                        </td>
                        <td className="col-tight">
                          {isMine && (
                            <button type="button" className="btn small secondary" disabled={qtd <= 0} onClick={() => equiparArmadura(idx)}>
                              Equipar
                            </button>
                          )}
                        </td>
                        <td className="col-tight">
                          {isMine && (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Editar"
                              onClick={() => setEditTarget({ tipo: "armadura", idx, data: a })}
                            >
                              ✏️
                            </button>
                          )}
                        </td>
                      </tr>
                      {armorInfoRow(idx, a, `ai-${idx}`, 6)}
                    </Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
              )}
            </>
          )}

          {remedioPairs.length > 0 && (
            <>
              {tableHead("inv-genericos", "Itens Genéricos / Remédios", remedioPairs.length)}
              {openTables.has("inv-genericos") && (
              <div className="sheet-table-wrap">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Peso</th>
                    <th>Preço</th>
                    <th>Qtd</th>
                    <th>Usos</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {remedioPairs.map(([idx, r]) => {
                    const max = num(r.usosMax, 0);
                    const isGenerico = max === 0;
                    return (
                      <Fragment key={idx}>
                      <tr>
                        <td className="name">
                          <button type="button" className="item-name-btn" onClick={() => toggleExpanded(`g-${idx}`)}>
                            {r.item}
                          </button>
                        </td>
                        <td className="col-tight">{PESO_LABELS[pesoDe(r)]}</td>
                        <td className="col-tight">{r.preco}</td>
                        <td className="col-tight">
                          {isGenerico ? (
                            isMine ? (
                              <input
                                type="number"
                                className="qty-input"
                                min={0}
                                value={Math.max(0, num(r.quantidade, 1))}
                                onChange={(e) => setQuantidade(idx, e.target.value)}
                              />
                            ) : (
                              Math.max(0, num(r.quantidade, 1))
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="col-tight">
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
                        <td className="col-tight">
                          {isMine && (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Editar"
                              onClick={() => setEditTarget({ tipo: "generico", idx, data: r })}
                            >
                              ✏️
                            </button>
                          )}
                        </td>
                      </tr>
                      {genericoInfoRow(idx, r, `g-${idx}`, 6)}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
              )}
            </>
          )}
        </div>
      )}

      {!equipHtmlVisible && !inventarioHtmlVisible && (
        <div className="derived-note">Nada em Equipamento ou Inventário ainda.</div>
      )}

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

      {editTarget && (
        <EditItemDialog
          target={editTarget}
          onSave={salvarEdicao}
          onRemove={removerItemEditado}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </>
  );
}
