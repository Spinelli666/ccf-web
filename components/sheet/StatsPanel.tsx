"use client";

import { useState } from "react";
import { computeDerived, equippedArmorSum, num, clamp } from "@/lib/derived";
import { rollDie } from "@/lib/dice";
import { DescansoDialog } from "@/components/dialogs/DescansoDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { LevelUpDialog } from "@/components/dialogs/LevelUpDialog";
import type { FullSheetData } from "@/lib/sheet-types";

const SURVIVAL_FIELDS = [
  { key: "insania", label: "🧠 Sanidade", max: 5 },
  { key: "toxidade", label: "☣️ Toxidade", max: 5 },
  { key: "fome", label: "🍖 Fome", max: 3 },
  { key: "sede", label: "💧 Sede", max: 3 },
] as const;

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
  const [showExecutar, setShowExecutar] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [pvDelta, setPvDelta] = useState("");
  const [peDelta, setPeDelta] = useState("");
  const [ignoreArmor, setIgnoreArmor] = useState(false);

  const nome = sheet.name || "Personagem";
  const derived = computeDerived(sheet);
  const pvBonusTemp = Math.max(0, num(sheet.pvBonusTemp, 0));
  const peBonusTemp = Math.max(0, num(sheet.peBonusTemp, 0));
  const pvMaxTotal = derived.pvMax + pvBonusTemp;
  const peMaxTotal = derived.peMax + peBonusTemp;
  const pvAtual = clamp(num(sheet.stats.pvAtual), -derived.pvMax, pvMaxTotal);
  const peAtual = clamp(num(sheet.stats.peAtual), 0, peMaxTotal);
  const derrotado = pvAtual <= 0;
  const morto = !!sheet.morto;
  const julg = sheet.julgamento || { sentencas: 0, dadivas: 0 };
  const estabilizado = julg.dadivas >= 3;
  const xp = clamp(num(sheet.xp, 0), 0, 100);

  const armaduraEquipada = equippedArmorSum(sheet.armaduras);
  const armaduraBonus = num(sheet.armaduraBonusManual, 0);
  const armaduraMaximo = derived.armaduraNatural + armaduraEquipada + armaduraBonus;
  const armaduraAtual =
    sheet.armaduraAtual === null || sheet.armaduraAtual === undefined
      ? armaduraMaximo
      : clamp(num(sheet.armaduraAtual), 0, armaduraMaximo);

  function toggleFratura(i: number) {
    const atual = clamp(num(sheet.fraturas), 0, 5);
    onChange({ fraturas: atual > i ? i : i + 1 });
  }

  function toggleSurvival(key: "insania" | "toxidade" | "fome" | "sede", max: number, i: number) {
    const atual = clamp(num(sheet[key]), 0, max);
    onChange({ [key]: atual > i ? i : i + 1 } as Partial<FullSheetData>);
  }

  function sofrerDano() {
    const v = Math.abs(num(pvDelta, 0));
    if (!v) return;
    let finalDano = ignoreArmor ? v : Math.max(0, v - armaduraAtual);
    let novoPvBonusTemp = pvBonusTemp;
    let descontoBonus = 0;
    if (novoPvBonusTemp > 0 && finalDano > 0) {
      descontoBonus = Math.min(novoPvBonusTemp, finalDano);
      novoPvBonusTemp -= descontoBonus;
      finalDano -= descontoBonus;
    }
    const novoPv = clamp(pvAtual - finalDano, -derived.pvMax, derived.pvMax + novoPvBonusTemp);
    onChange({ stats: { ...sheet.stats, pvAtual: String(novoPv) }, pvBonusTemp: novoPvBonusTemp });
    onLog(
      `${nome} sofreu ${v} de dano${!ignoreArmor && armaduraAtual ? " (armadura já descontada)" : ""}${
        descontoBonus ? ` — ${descontoBonus} absorvido pelo Bônus de Vida` : ""
      } — PV: ${novoPv}/${derived.pvMax + novoPvBonusTemp}`
    );
    setPvDelta("");
  }

  function curarPv() {
    const v = Math.abs(num(pvDelta, 0));
    if (!v) return;
    const novoPv = clamp(pvAtual + v, -derived.pvMax, pvMaxTotal);
    const patch: Partial<FullSheetData> = { stats: { ...sheet.stats, pvAtual: String(novoPv) } };
    if (novoPv > 0) patch.julgamento = { sentencas: 0, dadivas: 0 };
    onChange(patch);
    onLog(`${nome} curou ${v} de PV — PV: ${novoPv}/${pvMaxTotal}`);
    setPvDelta("");
  }

  function gastarPe() {
    const v = Math.abs(num(peDelta, 0));
    if (!v) return;
    let restante = v;
    let descontoBonus = 0;
    let novoPeBonusTemp = peBonusTemp;
    if (novoPeBonusTemp > 0) {
      descontoBonus = Math.min(novoPeBonusTemp, restante);
      novoPeBonusTemp -= descontoBonus;
      restante -= descontoBonus;
    }
    const novoPe = clamp(peAtual - restante, 0, derived.peMax + novoPeBonusTemp);
    onChange({ stats: { ...sheet.stats, peAtual: String(novoPe) }, peBonusTemp: novoPeBonusTemp });
    onLog(
      `${nome} gastou ${v} de PE${descontoBonus ? ` (${descontoBonus} do Bônus de Energia)` : ""} — PE: ${novoPe}/${
        derived.peMax + novoPeBonusTemp
      }`
    );
    setPeDelta("");
  }

  function recuperarPe() {
    const v = Math.abs(num(peDelta, 0));
    if (!v) return;
    const novoPe = clamp(peAtual + v, 0, peMaxTotal);
    onChange({ stats: { ...sheet.stats, peAtual: String(novoPe) } });
    onLog(`${nome} recuperou ${v} de PE — PE: ${novoPe}/${peMaxTotal}`);
    setPeDelta("");
  }

  function rest(tipo: "curto" | "longo") {
    setShowRest(false);
    const dados = tipo === "curto" ? 1 : 2;
    const multVigor = tipo === "curto" ? 2 : 3;
    const rolls = Array.from({ length: dados }, () => rollDie(20));
    const soma = rolls.reduce((a, b) => a + b, 0);
    const recuperado = soma + multVigor * derived.vigor;
    const novoPv = clamp(pvAtual + recuperado, -derived.pvMax, pvMaxTotal);
    const novoPe = clamp(peAtual + recuperado, 0, peMaxTotal);
    const patch: Partial<FullSheetData> = {
      stats: { ...sheet.stats, pvAtual: String(novoPv), peAtual: String(novoPe) },
      efeitosAtivos: sheet.efeitosAtivos.filter((e) => e !== "Exaustão"),
    };
    let extra = "";
    if (tipo === "longo") {
      patch.fraturas = Math.max(0, num(sheet.fraturas) - 1);
      patch.insania = clamp(num(sheet.insania, 0) - 1, 0, 5);
      patch.toxidade = clamp(num(sheet.toxidade, 0) - 2, 0, 5);
      patch.racaHabilidades = sheet.racaHabilidades.map((a) =>
        num(a.usosDiarios, 0) > 0 ? { ...a, usosGastos: 0 } : a
      );
      extra = ", removeu Exaustão, -1 Fratura, -1 Sanidade, -2 Toxidade, habilidades diárias liberadas";
    } else {
      extra = ", removeu Exaustão";
    }
    onChange(patch);
    onLog(
      `${nome} fez um Descanso ${tipo === "curto" ? "Curto" : "Longo"} (${dados}d20${
        multVigor > 0 ? `+${multVigor}×Vigor` : ""
      } = ${recuperado}): recuperou PV e PE${extra}.`
    );
  }

  function rolarJulgamento() {
    const roll = rollDie(20);
    const next = { ...julg };
    let resultado: string;
    if (roll <= 10) {
      next.sentencas = clamp(next.sentencas + 1, 0, 3);
      resultado = `Sentença de Morte (${next.sentencas}/3)`;
    } else {
      next.dadivas = clamp(next.dadivas + 1, 0, 3);
      resultado = `Dádiva de Vida (${next.dadivas}/3)`;
    }
    const patch: Partial<FullSheetData> = { julgamento: next };
    if (next.sentencas >= 3) patch.morto = true;
    onChange(patch);
    onLog(
      `${nome} — Teste de Julgamento: rolou ${roll} → ${resultado}${
        next.sentencas >= 3 ? " — ☠️ MORREU (3 Sentenças)" : next.dadivas >= 3 ? " — 🩹 Estabilizado" : ""
      }`
    );
  }

  function executar() {
    setShowExecutar(false);
    onChange({ morto: true });
    onLog(`${nome} foi executado enquanto estava Derrotado.`);
  }

  function poupar() {
    onChange({ stats: { ...sheet.stats, pvAtual: "1" }, julgamento: { sentencas: 0, dadivas: 0 } });
    onLog(`${nome} foi poupado (Compaixão) — fica com 1 PV e Inconsciente.`);
  }

  return (
    <div className="section" style={{ marginTop: 0 }}>
      <h2>Recursos</h2>
      {morto && <div className="derrotado-banner morto">☠️ MORTO — o personagem não resistiu aos ferimentos.</div>}
      {!morto && derrotado && (
        <div className="derrotado-banner">
          ⚠️ DERROTADO — {derived.fraturas >= 5 ? "5 Fraturas acumuladas" : "PV chegou a zero"}.
        </div>
      )}

      {!morto && derrotado && (
        <div className="julgamento-panel">
          <div className="julgamento-title">⚖️ Teste de Julgamento</div>
          <div className="julgamento-row">
            <span>Sentenças de Morte: {"●".repeat(julg.sentencas)}{"○".repeat(Math.max(0, 3 - julg.sentencas))}</span>
            <span>Dádivas de Vida: {"🩹".repeat(julg.dadivas)}{"🤍".repeat(Math.max(0, 3 - julg.dadivas))}</span>
          </div>
          {estabilizado ? (
            <div className="derived-note">
              Estabilizado por Dádivas — permanece Inconsciente com 0 PV até receber cura.
            </div>
          ) : (
            isMine && (
              <div className="julgamento-actions">
                <button type="button" className="btn small secondary" onClick={rolarJulgamento}>
                  🎲 Rolar Julgamento (1d20)
                </button>
                <button type="button" className="btn small danger" onClick={() => setShowExecutar(true)}>
                  ⚔️ Executar
                </button>
                <button type="button" className="btn small" onClick={poupar}>
                  ❤️ Poupar (Compaixão)
                </button>
              </div>
            )
          )}
        </div>
      )}

      <div className="resource-grid resource-grid-top">
        <div className="resource-box">
          <div className="mini-row">
            <span className="mini-label">Nível</span>
            <input
              type="number"
              className="mini-input"
              disabled={!isMine}
              value={sheet.nivel}
              min={1}
              onChange={(e) => onChange({ nivel: e.target.value })}
            />
          </div>
          <div className="mini-row">
            <span className="mini-label">XP</span>
            <input
              type="number"
              className="mini-input"
              disabled={!isMine}
              value={xp}
              min={0}
              max={100}
              onChange={(e) => onChange({ xp: clamp(num(e.target.value, 0), 0, 100) })}
            />
          </div>
          <div className="mini-row">
            <span className="mini-label">Deslocamento</span>
            <span className="info-val">{derived.deslocamento}m</span>
          </div>
          <div className="mini-row">
            <span className="mini-label">Acerto Crítico</span>
            <span className="info-val">{derived.critRange}</span>
          </div>
          <div className="mini-row armor-row" title="Armadura: Valor Atual | Valor Máximo · Bônus de Armadura">
            <span className="mini-label">Armadura</span>
            <span className="armor-fields">
              <input
                type="number"
                className="mini-input"
                disabled={!isMine}
                value={armaduraAtual}
                title="Valor Atual"
                onChange={(e) => onChange({ armaduraAtual: clamp(num(e.target.value, 0), 0, armaduraMaximo) })}
              />
              <span className="armor-sep">|</span>
              <span className="info-val armor-max" title="Valor Máximo">
                {armaduraMaximo}
              </span>
              <input
                type="number"
                className="mini-input mini-input-bonus"
                disabled={!isMine}
                value={armaduraBonus}
                title="Bônus de Armadura"
                onChange={(e) => {
                  const novoBonus = num(e.target.value, 0);
                  const novoMax = derived.armaduraNatural + armaduraEquipada + novoBonus;
                  onChange({ armaduraBonusManual: novoBonus, armaduraAtual: clamp(armaduraAtual, 0, novoMax) });
                }}
              />
            </span>
          </div>
          {xp >= 100 && (
            <>
              <div className="survival-warn">🎉 100 XP — pronto pra subir de Nível!</div>
              {isMine && (
                <button
                  type="button"
                  className="btn small"
                  style={{ width: "100%", marginTop: 6 }}
                  onClick={() => setShowLevelUp(true)}
                >
                  ⭐ Subir de Nível
                </button>
              )}
            </>
          )}
        </div>

        <div className="resource-box survival-box-combined">
          <div className="mini-row">
            <span className="mini-label">🦴 Fratura</span>
            <div className="pip-boxes">
              {[0, 1, 2, 3, 4].map((i) => (
                <input
                  key={i}
                  type="checkbox"
                  className="cost-box"
                  disabled={!isMine}
                  checked={num(sheet.fraturas) > i}
                  onChange={() => toggleFratura(i)}
                />
              ))}
            </div>
          </div>
          {SURVIVAL_FIELDS.map(({ key, label, max }) => (
            <div className="mini-row" key={key}>
              <span className="mini-label">{label}</span>
              <div className="pip-boxes">
                {Array.from({ length: max }, (_, i) => (
                  <input
                    key={i}
                    type="checkbox"
                    className="cost-box"
                    disabled={!isMine}
                    checked={num(sheet[key]) > i}
                    onChange={() => toggleSurvival(key, max, i)}
                  />
                ))}
              </div>
            </div>
          ))}
          {[
            derived.fraturas >= 5 ? "5 Fraturas = Derrotado." : "",
            num(sheet.insania) >= 5
              ? "🌀 Surto psicótico!"
              : num(sheet.insania) >= 4
              ? "Desv. Aprimorada em Int./Persuasão."
              : "",
            num(sheet.toxidade) >= 5 ? "Toxidade: Exaustão + Intoxicado." : "",
            num(sheet.fome) >= 3 ? "Fome: Exaustão." : "",
            num(sheet.sede) >= 3 ? "Sede: Exaustão." : "",
          ]
            .filter(Boolean)
            .map((w, i) => (
              <div className="survival-warn" key={i}>
                {w}
              </div>
            ))}
          {isMine && (
            <button type="button" className="btn ghost small" style={{ marginTop: 10, width: "100%" }} onClick={() => setShowRest(true)}>
              😴 Descanso
            </button>
          )}
        </div>
      </div>

      <div className="resource-grid resource-grid-bottom">
        <div className="resource-box">
          <div className="resource-label pv-bonus-row">💔</div>
          <div className="resource-bar-wrap">
            <div className="resource-bar">
              <div
                className="resource-fill pv-fill"
                style={{ width: `${pvMaxTotal ? clamp((pvAtual / pvMaxTotal) * 100, 0, 100) : 0}%` }}
              />
            </div>
            <div className="resource-bar-text">
              {pvAtual} | {pvMaxTotal}
            </div>
          </div>
          <div className="resource-bonus-row pv-bonus-row">
            <label>Bônus de Vida</label>
            <input
              type="number"
              className="mini-input"
              min={0}
              disabled={!isMine}
              value={pvBonusTemp}
              onChange={(e) => onChange({ pvBonusTemp: Math.max(0, num(e.target.value, 0)) })}
            />
          </div>
          {isMine && (
            <>
              <div className="resource-controls">
                <input
                  type="number"
                  placeholder="0"
                  className="resource-delta-input"
                  value={pvDelta}
                  onChange={(e) => setPvDelta(e.target.value)}
                />
                <button type="button" className="btn small secondary" onClick={sofrerDano}>
                  Sofrer dano
                </button>
                <button type="button" className="btn small" onClick={curarPv}>
                  Curar
                </button>
              </div>
              <label className="chk-inline ignore-armor-label">
                <input type="checkbox" checked={ignoreArmor} onChange={(e) => setIgnoreArmor(e.target.checked)} /> Ignorar
                Armadura
              </label>
            </>
          )}
        </div>

        <div className="resource-box">
          <div className="resource-label">⚡</div>
          <div className="resource-bar-wrap">
            <div className="resource-bar">
              <div
                className="resource-fill pe-fill"
                style={{ width: `${Math.max(0, (peAtual / Math.max(1, peMaxTotal)) * 100)}%` }}
              />
            </div>
            <div className="resource-bar-text">
              {peAtual} | {peMaxTotal}
            </div>
          </div>
          <div className="resource-bonus-row">
            <label>Bônus de Energia</label>
            <input
              type="number"
              className="mini-input"
              min={0}
              disabled={!isMine}
              value={peBonusTemp}
              onChange={(e) => onChange({ peBonusTemp: Math.max(0, num(e.target.value, 0)) })}
            />
          </div>
          {isMine && (
            <div className="resource-controls">
              <input
                type="number"
                placeholder="0"
                className="resource-delta-input"
                value={peDelta}
                onChange={(e) => setPeDelta(e.target.value)}
              />
              <button type="button" className="btn small secondary" onClick={gastarPe}>
                Gastar
              </button>
              <button type="button" className="btn small" onClick={recuperarPe}>
                Recuperar
              </button>
            </div>
          )}
        </div>
      </div>

      {showRest && (
        <DescansoDialog
          onCurto={() => rest("curto")}
          onLongo={() => rest("longo")}
          onCancel={() => setShowRest(false)}
        />
      )}
      {showExecutar && (
        <ConfirmDialog
          title="Executar"
          message="Executar este personagem? Essa ação mata o personagem instantaneamente."
          confirmLabel="Executar"
          onConfirm={executar}
          onCancel={() => setShowExecutar(false)}
        />
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
              xp: clamp(xp - 100, 0, 100),
              stats: {
                ...sheet.stats,
                pvAtual: String(num(sheet.stats.pvAtual) + 5),
                peAtual: String(num(sheet.stats.peAtual) + 1),
              },
            });
            onLog(`${nome} subiu para o nível ${patch.nivel}!`);
            setShowLevelUp(false);
          }}
        />
      )}
    </div>
  );
}
