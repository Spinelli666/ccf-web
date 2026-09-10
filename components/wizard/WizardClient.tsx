"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeDerived, num } from "@/lib/derived";
import { ABILITIES_LIBRARY, AUTO_GRANT_ABILITIES, CLASSES_ORDENADAS } from "@/lib/classes-lookup";
import { RACE_PERICIA_BONUS } from "@/data/rulebook";
import { AddEquipmentDialog } from "@/components/dialogs/AddEquipmentDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import {
  emptySheetData,
  type Arma,
  type Armadura,
  type HabilidadeClasse,
  type HabilidadeRaca,
  type Pericia,
  type Remedio,
} from "@/lib/sheet-types";

const STEP_TITLES = ["Identidade", "Raça", "Classe", "Perícias", "Equipamento", "Biografia"];

type RaceOption = { nome: string; habilidades: { nome: string; desc: string }[] };
type ClasseSel = { on: boolean; aprim: boolean[] };

export function WizardClient({ mesaId, races }: { mesaId: string; races: RaceOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [nivel, setNivel] = useState("1");
  const [racaTitulo, setRacaTitulo] = useState("");
  const [racaHabilidades, setRacaHabilidades] = useState<HabilidadeRaca[]>([]);
  const [classeTitulo, setClasseTitulo] = useState("");
  const [classeSelecoes, setClasseSelecoes] = useState<Record<string, ClasseSel>>({});
  const [pericias, setPericias] = useState<Pericia[]>(emptySheetData().pericias.map((p) => ({ ...p, valor: "0" })));
  const [armas, setArmas] = useState<Arma[]>([]);
  const [armaduras, setArmaduras] = useState<Armadura[]>([]);
  const [remedios, setRemedios] = useState<Remedio[]>([]);
  const [biografia, setBiografia] = useState("");
  const [showAddEq, setShowAddEq] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const nivelAtual = num(nivel, 1);
  // Racial do Elfo ("Conhecimento Antigo"): +1 Ponto de Habilidade permanente, ganho no nível 1.
  const phBudget = nivelAtual + 1 + (racaTitulo === "Elfo" ? 1 : 0);
  const phUsado = Object.values(classeSelecoes).reduce(
    (sum, sel) => sum + (sel.on ? 1 : 0) + sel.aprim.filter(Boolean).length,
    0
  );
  const autoGrant = useMemo(() => (classeTitulo ? AUTO_GRANT_ABILITIES[classeTitulo] || [] : []), [classeTitulo]);
  const listaHabilidades = useMemo(
    () => (classeTitulo ? (ABILITIES_LIBRARY[classeTitulo] || []).filter((e) => !autoGrant.includes(e.nome)) : []),
    [classeTitulo, autoGrant]
  );
  const q = search.trim().toLowerCase();
  const listaFiltrada = q ? listaHabilidades.filter((e) => (e.nome + " " + e.efeito).toLowerCase().includes(q)) : listaHabilidades;
  const bonusMap = (RACE_PERICIA_BONUS as Record<string, Record<string, number>>)[racaTitulo] || {};

  function rebuildClasseHabilidades(selecoes: Record<string, ClasseSel>): HabilidadeClasse[] {
    const novas: HabilidadeClasse[] = [];
    for (const classe of CLASSES_ORDENADAS) {
      const list = ABILITIES_LIBRARY[classe] || [];
      const autoGrantC = AUTO_GRANT_ABILITIES[classe] || [];
      const novasDestaClasse: HabilidadeClasse[] = [];
      list.forEach((entry) => {
        const sel = selecoes[entry.nome];
        if (!sel?.on) return;
        novasDestaClasse.push({
          nome: entry.nome,
          tipo: entry.tipo,
          custo: entry.custo,
          custoPE: entry.custoPE !== undefined ? String(entry.custoPE) : "",
          efeito: entry.efeito,
          indent: false,
          usosGastos: 0,
          temContador: false,
          contadorMax: "",
          contadorAtual: 0,
        });
        (entry.aprimoramentos || []).forEach((ap, ai) => {
          if (sel.aprim[ai]) {
            novasDestaClasse.push({
              nome: ap.nome,
              tipo: "—",
              custo: "1 PH",
              custoPE: ap.custoPE !== undefined ? String(ap.custoPE) : "",
              efeito: ap.efeito,
              indent: true,
              ativo: true,
              usosGastos: 0,
              temContador: false,
              contadorMax: "",
              contadorAtual: 0,
            });
          }
        });
      });
      if (novasDestaClasse.length > 0) {
        const extras: HabilidadeClasse[] = autoGrantC
          .map((nome) => list.find((e) => e.nome === nome))
          .filter((e): e is NonNullable<typeof e> => !!e)
          .map((entry) => ({
            nome: entry.nome,
            tipo: entry.tipo,
            custo: entry.custo,
            custoPE: entry.custoPE !== undefined ? String(entry.custoPE) : "",
            efeito: entry.efeito,
            indent: false,
            usosGastos: 0,
            temContador: false,
            contadorMax: "",
            contadorAtual: 0,
          }));
        novas.push(...extras, ...novasDestaClasse);
      }
    }
    return novas;
  }

  function toggleAbility(nome: string, checked: boolean) {
    setClasseSelecoes((prev) => ({
      ...prev,
      [nome]: { on: checked, aprim: checked ? prev[nome]?.aprim || [false, false, false] : [false, false, false] },
    }));
  }
  function toggleAprim(nome: string, ai: number, checked: boolean) {
    setClasseSelecoes((prev) => {
      const current = prev[nome] || { on: false, aprim: [false, false, false] };
      const aprim = current.aprim.slice();
      aprim[ai] = checked;
      return { ...prev, [nome]: { ...current, aprim } };
    });
  }

  function randomizePericias() {
    const n = pericias.length;
    const alloc12 = new Array(n).fill(0);
    let remaining = 12;
    let guard = 0;
    while (remaining > 0 && guard < 2000) {
      const idx = Math.floor(Math.random() * n);
      if (alloc12[idx] < 3) {
        alloc12[idx]++;
        remaining--;
      }
      guard++;
    }
    const alloc3 = new Array(n).fill(0);
    for (let k = 0; k < 3; k++) alloc3[Math.floor(Math.random() * n)]++;
    setPericias((prev) => prev.map((p, i) => ({ ...p, valor: String(alloc12[i] + alloc3[i]) })));
  }

  function goNext() {
    setError(null);
    if (step === 1 && !name.trim()) {
      setError("Escreve o nome do personagem antes de continuar.");
      return;
    }
    if (step === 2 && !racaTitulo.trim()) {
      setError("Escolhe uma raça da Biblioteca antes de continuar.");
      return;
    }
    if (step === 3 && !classeTitulo.trim()) {
      setError("Escolhe uma Classe antes de continuar.");
      return;
    }
    setStep((s) => s + 1);
  }

  async function finish() {
    const bonusMapFinal = (RACE_PERICIA_BONUS as Record<string, Record<string, number>>)[racaTitulo] || {};
    const finalPericias = pericias.map((p) => ({ ...p, valor: String(num(p.valor, 0) + (bonusMapFinal[p.nome] || 0)) }));
    const classeHabilidades = rebuildClasseHabilidades(classeSelecoes);
    const derivedPreview = computeDerived({ nivel, fraturas: 0, pericias: finalPericias, stats: {} });

    const data = emptySheetData({
      name: name.trim(),
      playerName: "",
      nivel,
      biografia: biografia.trim(),
      racaTitulo,
      racaHabilidades,
      classeTitulo,
      classePH: String(phBudget),
      classeHabilidades,
      pericias: finalPericias,
      armas,
      armaduras,
      remedios,
      stats: {
        pvBonus: "0",
        peBonus: "0",
        armaduraNaturalBonus: "0",
        deslocamentoBonus: "0",
        inventarioBonus: "0",
        pvAtual: String(derivedPreview.pvMax),
        peAtual: String(derivedPreview.peMax),
      },
    });

    const res = await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesaId, name: name.trim(), private: false, data }),
    });
    if (res.ok) {
      const sheet = await res.json();
      router.push(`/mesas/${mesaId}/sheets/${sheet.id}`);
    } else {
      setError("Não foi possível criar a ficha. Tenta de novo.");
    }
  }

  return (
    <div className="frame">
      <div className="wizard-steps">
        {STEP_TITLES.map((t, i) => {
          const n = i + 1;
          const cls = n === step ? "active" : n < step ? "done" : "";
          return (
            <div key={t} className={`wizard-step-dot ${cls}`}>
              {n}. {t}
            </div>
          );
        })}
      </div>
      <div className="wizard-step-title">
        Passo {step} de 6 — {STEP_TITLES[step - 1]}
      </div>

      {step === 1 && (
        <div className="form-section">
          <h3>Identidade</h3>
          <div className="field-row">
            <div className="field">
              <label>Nome do personagem *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Harry de Hazel" autoFocus />
            </div>
            <div className="field">
              <label>Nível</label>
              <input type="number" min={1} value={nivel} onChange={(e) => setNivel(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="form-section">
          <h3>Raça</h3>
          <div className="field-row">
            <div className="field">
              <label>Escolher da Biblioteca *</label>
              <select
                value={racaTitulo}
                onChange={(e) => {
                  const chosen = races.find((r) => r.nome === e.target.value);
                  if (chosen) {
                    setRacaTitulo(chosen.nome);
                    setRacaHabilidades(
                      chosen.habilidades.map((h) => ({
                        nome: h.nome,
                        desc: h.desc,
                        usosDiarios: (h as { usosDiarios?: string | number }).usosDiarios ?? "",
                        usosGastos: 0,
                        temContador: false,
                        contadorMax: "",
                        contadorAtual: 0,
                      }))
                    );
                  }
                }}
              >
                <option value="">— escolher —</option>
                {races.map((r) => (
                  <option key={r.nome} value={r.nome}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {racaHabilidades.length > 0 ? (
            <div className="wizard-preview">
              <b>Habilidades raciais carregadas:</b>
              <ul>
                {racaHabilidades.map((a) => (
                  <li key={a.nome}>
                    <b>{a.nome}</b> — {a.desc}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="derived-note">Nenhuma raça escolhida ainda.</p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="form-section">
          <h3>Classe</h3>
          <div className="wizard-class-buttons">
            {CLASSES_ORDENADAS.map((c) => (
              <button
                key={c}
                type="button"
                className={`wizard-class-btn ${classeTitulo === c ? "active" : ""}`}
                onClick={() => setClasseTitulo(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="ph-budget-bar">
            Pontos de Habilidade: <b>{phUsado} / {phBudget}</b>{" "}
            <span className="derived-note" style={{ margin: 0 }}>
              (2 na criação + 1 por Nível acima do 1º — Nível atual: {nivelAtual})
            </span>
          </div>
          {autoGrant.length > 0 && (
            <p className="derived-note">
              Ao escolher qualquer habilidade abaixo, você recebe automaticamente e sem custo: <b>{autoGrant.join(", ")}</b>.
            </p>
          )}
          {classeTitulo ? (
            <>
              <input
                type="text"
                className="ability-search-input"
                placeholder="🔍 Buscar habilidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="wizard-ability-list">
                {listaFiltrada.map((entry) => {
                  const sel = classeSelecoes[entry.nome] || { on: false, aprim: [false, false, false] };
                  const baseDisabled = !sel.on && phUsado >= phBudget;
                  return (
                    <div key={entry.nome} className="wizard-ability-block">
                      <label className="chk-inline">
                        <input
                          type="checkbox"
                          className="ability-select-checkbox"
                          checked={sel.on}
                          disabled={baseDisabled}
                          onChange={(e) => toggleAbility(entry.nome, e.target.checked)}
                        />
                        <b>{entry.nome}</b> — <span className="ability-meta">{entry.tipo} · {entry.custo}</span>
                      </label>
                      <div className="ability-desc">{entry.efeito}</div>
                      {(entry.aprimoramentos ?? []).length > 0 && (
                        <div className="wizard-aprim-list">
                          {(entry.aprimoramentos ?? []).map((ap, ai) => {
                            const apOn = !!sel.aprim[ai];
                            const apDisabled = !sel.on || (!apOn && phUsado >= phBudget);
                            return (
                              <label key={ap.nome} className="chk-inline aprim-line">
                                <input
                                  type="checkbox"
                                  className="ability-select-checkbox"
                                  checked={apOn}
                                  disabled={apDisabled}
                                  onChange={(e) => toggleAprim(entry.nome, ai, e.target.checked)}
                                />
                                {ap.nome}: {ap.efeito}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="derived-note">Escolha uma classe acima pra ver as habilidades disponíveis.</p>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="form-section">
          <h3>Perícias</h3>
          <p className="derived-note">
            Digite quantos pontos você quer <b>investir</b> em cada perícia — 12 pontos (máx. 3 cada) + 3 pontos livres
            acumuláveis. O bônus da sua raça ({racaTitulo || "nenhuma raça escolhida"}) é somado automaticamente por
            cima, no total mostrado abaixo do campo.
          </p>
          <button type="button" className="add-row-btn" style={{ marginBottom: 12 }} onClick={randomizePericias}>
            🎲 Distribuir Aleatoriamente
          </button>
          <div className="field-row">
            {pericias.map((p, i) => {
              const bonus = bonusMap[p.nome] || 0;
              const investido = num(p.valor, 0);
              return (
                <div key={p.nome} className="field" style={{ minWidth: 100, flex: "0 0 auto" }}>
                  <label>
                    {p.nome} {bonus > 0 && <span className="racial-bonus-tag">+{bonus} racial</span>}
                  </label>
                  <input
                    type="number"
                    value={p.valor}
                    onChange={(e) => {
                      const next = pericias.slice();
                      next[i] = { ...next[i], valor: e.target.value };
                      setPericias(next);
                    }}
                  />
                  <span className="pericia-total-preview">
                    Total: <b>{investido + bonus}</b>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="form-section">
          <h3>Equipamento</h3>
          <button type="button" className="add-row-btn" onClick={() => setShowAddEq(true)}>
            + Adicionar Equipamento
          </button>
          {armas.length > 0 || armaduras.length > 0 ? (
            <div className="wizard-preview">
              <b>Equipamento adicionado:</b>
              <ul>
                {armas.map((a, i) => (
                  <li key={`a${i}`}>🗡️ {a.item}</li>
                ))}
                {armaduras.map((a, i) => (
                  <li key={`b${i}`}>
                    🛡️ {a.item} ({a.parte})
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="derived-note">Nenhum equipamento adicionado ainda (opcional — dá pra adicionar depois).</p>
          )}
          {showAddEq && (
            <AddEquipmentDialog
              onCancel={() => setShowAddEq(false)}
              onAdd={({ armas: novasArmas, armaduras: novasArmaduras, remedios: novosRemedios }) => {
                setArmas((prev) => [...prev, ...novasArmas.map((a) => ({ ...a, equipado: true, durabilidadeAtual: 0, durabilidadeMax: 0 }))]);
                setArmaduras((prev) => [
                  ...prev,
                  ...novasArmaduras.map((a) => ({ ...a, equipado: true, durabilidadeAtual: 0, durabilidadeMax: 0 })),
                ]);
                setRemedios((prev) => [...prev, ...novosRemedios]);
                setShowAddEq(false);
              }}
            />
          )}
        </div>
      )}

      {step === 6 && (
        <div className="form-section">
          <h3>📜 Biografia</h3>
          <div className="field-row">
            <div className="field">
              <label>História, aparência, personalidade... (opcional)</label>
              <textarea
                style={{ minHeight: 120 }}
                value={biografia}
                onChange={(e) => setBiografia(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {error && <p className="survival-warn">{error}</p>}

      <div className="form-actions" style={{ justifyContent: "space-between" }}>
        <button className="btn ghost" type="button" onClick={() => setShowCancel(true)}>
          Cancelar
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          {step > 1 && (
            <button className="btn secondary" type="button" onClick={() => setStep((s) => s - 1)}>
              ← Voltar
            </button>
          )}
          {step < 6 ? (
            <button className="btn" type="button" onClick={goNext}>
              Próximo →
            </button>
          ) : (
            <button className="btn" type="button" onClick={finish}>
              ✅ Finalizar e Criar Ficha
            </button>
          )}
        </div>
      </div>

      {showCancel && (
        <ConfirmDialog
          title="Cancelar criação"
          message="Descartar essa ficha e voltar pra galeria? Nada será salvo."
          confirmLabel="Descartar"
          onConfirm={() => router.push(`/mesas/${mesaId}/gallery`)}
          onCancel={() => setShowCancel(false)}
        />
      )}
    </div>
  );
}
