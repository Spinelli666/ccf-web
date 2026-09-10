"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ABILITIES_LIBRARY, AUTO_GRANT_ABILITIES, CLASSES_ORDENADAS, findAbilityClass } from "@/lib/classes-lookup";
import { num } from "@/lib/derived";
import type { FullSheetData, HabilidadeClasse, Pericia } from "@/lib/sheet-types";

type Classe = (typeof CLASSES_ORDENADAS)[number];
type SelecaoNova =
  | { tipo: "base"; classe: Classe; nome: string }
  | { tipo: "aprim"; classe: Classe; nome: string; ai: number };

type LinhaAtual = { idx: number; nome: string; indent: boolean; classe: string; baseIdx: number | null };

function isOwnedBase(classeHabilidades: HabilidadeClasse[], nome: string) {
  return classeHabilidades.some((a) => a.nome === nome && !a.indent);
}
function isOwnedAprimFor(classeHabilidades: HabilidadeClasse[], baseNome: string, apNome: string) {
  const idx = classeHabilidades.findIndex((a) => a.nome === baseNome && !a.indent);
  if (idx < 0) return false;
  for (let i = idx + 1; i < classeHabilidades.length; i++) {
    const row = classeHabilidades[i];
    if (!row.indent) break;
    if (row.nome === apNome) return true;
  }
  return false;
}

/** Quantos níveis múltiplos de 3 são cruzados entre `de` (exclusivo) e `ate` (inclusivo). */
function multiplosDe3Cruzados(de: number, ate: number): number {
  let n = 0;
  for (let lv = de + 1; lv <= ate; lv++) if (lv % 3 === 0) n++;
  return n;
}

/** Monta as linhas atuais de classeHabilidades (excluindo as concedidas automaticamente,
 * que não são escolhas independentes) já com a classe inferida e o índice da sua base. */
function montarLinhasAtuais(classeHabilidades: HabilidadeClasse[]): LinhaAtual[] {
  const linhas: LinhaAtual[] = [];
  let classeAtual: string | null = null;
  let baseIdxAtual: number | null = null;
  classeHabilidades.forEach((h, i) => {
    if (!h.indent) {
      classeAtual = findAbilityClass(h.nome) || "Outras";
      baseIdxAtual = i;
    }
    const auto = (AUTO_GRANT_ABILITIES[classeAtual as string] || []).includes(h.nome);
    if (auto) return;
    linhas.push({ idx: i, nome: h.nome, indent: h.indent, classe: classeAtual as string, baseIdx: h.indent ? baseIdxAtual : null });
  });
  return linhas;
}

export function AjustarNivelDialog({
  sheet,
  onApply,
  onCancel,
}: {
  sheet: FullSheetData;
  onApply: (patch: {
    nivel: string;
    classeHabilidades: HabilidadeClasse[];
    pericias: Pericia[];
    pvDelta: number;
    peDelta: number;
  }) => void;
  onCancel: () => void;
}) {
  const oldNivel = num(sheet.nivel, 1);
  const [novoNivelStr, setNovoNivelStr] = useState(String(oldNivel));
  const [step, setStep] = useState<"root" | "habilidades" | "pericias">("root");
  const [erro, setErro] = useState<string | null>(null);

  // fluxo de subida (diff > 0)
  const [classeAtual, setClasseAtual] = useState<Classe>(
    (CLASSES_ORDENADAS as readonly string[]).includes(sheet.classeTitulo) ? (sheet.classeTitulo as Classe) : CLASSES_ORDENADAS[0]
  );
  const [novasSelecoes, setNovasSelecoes] = useState<SelecaoNova[]>([]);
  const [search, setSearch] = useState("");
  const [alocPericias, setAlocPericias] = useState<number[]>(() => sheet.pericias.map(() => 0));

  // fluxo de descida (diff < 0)
  const [removidos, setRemovidos] = useState<Set<number>>(new Set());
  const linhasAtuais = montarLinhasAtuais(sheet.classeHabilidades);

  const novoNivel = Math.max(1, num(novoNivelStr, oldNivel));
  const diff = novoNivel - oldNivel;
  // Racial do Elfo ("Conhecimento Antigo"): +1 Ponto de Habilidade permanente, ganho no nível 1.
  const newBudget = novoNivel + 1 + (sheet.racaTitulo === "Elfo" ? 1 : 0);
  const currentUsed = sheet.classeHabilidades.filter(
    (a) => a.nome && !Object.values(AUTO_GRANT_ABILITIES).flat().includes(a.nome)
  ).length;
  const extraPH = diff > 0 ? Math.max(0, newBudget - currentUsed) : 0;
  const precisaRemover = diff < 0 ? Math.max(0, currentUsed - newBudget) : 0;
  const bonusPericiaCount = diff > 0 ? multiplosDe3Cruzados(oldNivel, novoNivel) : 0;

  const usadoAgora = novasSelecoes.length;
  const autoGrant = AUTO_GRANT_ABILITIES[classeAtual] || [];
  const listaHabilidades = (ABILITIES_LIBRARY[classeAtual] || []).filter((e) => !autoGrant.includes(e.nome));
  const q = search.trim().toLowerCase();
  const listaFiltrada = q ? listaHabilidades.filter((e) => (e.nome + " " + e.efeito).toLowerCase().includes(q)) : listaHabilidades;

  const mantidos = linhasAtuais.filter((l) => !removidos.has(l.idx)).length;
  const totalAlocado = alocPericias.reduce((a, b) => a + b, 0);

  function isSelecionadoBase(classe: Classe, nome: string) {
    return novasSelecoes.some((sel) => sel.tipo === "base" && sel.classe === classe && sel.nome === nome);
  }
  function isSelecionadoAprim(classe: Classe, nome: string, ai: number) {
    return novasSelecoes.some((sel) => sel.tipo === "aprim" && sel.classe === classe && sel.nome === nome && sel.ai === ai);
  }
  function toggleBase(nome: string, checked: boolean) {
    if (checked) setNovasSelecoes((prev) => [...prev, { tipo: "base", classe: classeAtual, nome }]);
    else setNovasSelecoes((prev) => prev.filter((sel) => !(sel.tipo === "base" && sel.classe === classeAtual && sel.nome === nome)));
  }
  function toggleAprim(nome: string, ai: number, checked: boolean) {
    if (checked) setNovasSelecoes((prev) => [...prev, { tipo: "aprim", classe: classeAtual, nome, ai }]);
    else
      setNovasSelecoes((prev) =>
        prev.filter((sel) => !(sel.tipo === "aprim" && sel.classe === classeAtual && sel.nome === nome && sel.ai === ai))
      );
  }

  function toggleLinha(linha: LinhaAtual, manter: boolean) {
    setRemovidos((prev) => {
      const next = new Set(prev);
      if (manter) {
        next.delete(linha.idx);
      } else {
        next.add(linha.idx);
        if (!linha.indent) {
          // remover a base cascateia pra seus aprimoramentos (não dá pra manter um
          // aprimoramento sem a habilidade base que ele melhora).
          linhasAtuais.forEach((outra) => {
            if (outra.baseIdx === linha.idx) next.add(outra.idx);
          });
        }
      }
      return next;
    });
  }

  function incPericia(i: number) {
    if (totalAlocado >= bonusPericiaCount) return;
    setAlocPericias((prev) => prev.map((v, k) => (k === i ? v + 1 : v)));
  }
  function decPericia(i: number) {
    setAlocPericias((prev) => prev.map((v, k) => (k === i && v > 0 ? v - 1 : v)));
  }

  function construirAdicoes(): HabilidadeClasse[] {
    const draft = JSON.parse(JSON.stringify(sheet.classeHabilidades)) as HabilidadeClasse[];
    novasSelecoes.forEach((sel) => {
      const list = ABILITIES_LIBRARY[sel.classe] || [];
      if (sel.tipo === "base") {
        const entry = list.find((e) => e.nome === sel.nome);
        if (entry && !isOwnedBase(draft, entry.nome)) {
          draft.push({
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
        }
      } else {
        const entry = list.find((e) => e.nome === sel.nome);
        const ap = entry?.aprimoramentos?.[sel.ai];
        if (ap && entry && !isOwnedAprimFor(draft, entry.nome, ap.nome)) {
          const baseIdx = draft.findIndex((a) => a.nome === entry.nome && !a.indent);
          const newRow: HabilidadeClasse = {
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
          };
          if (baseIdx >= 0) draft.splice(baseIdx + 1, 0, newRow);
          else draft.push(newRow);
        }
      }
    });
    return draft;
  }

  function construirRemocoes(): HabilidadeClasse[] {
    const classesComAlgo = new Set(linhasAtuais.filter((l) => !removidos.has(l.idx)).map((l) => l.classe));
    let classeAtualLoop: string | null = null;
    return sheet.classeHabilidades.filter((h, i) => {
      if (!h.indent) classeAtualLoop = findAbilityClass(h.nome) || "Outras";
      const auto = (AUTO_GRANT_ABILITIES[classeAtualLoop as string] || []).includes(h.nome);
      if (auto) return classesComAlgo.has(classeAtualLoop as string);
      return !removidos.has(i);
    });
  }

  function aplicar() {
    const classeHabilidadesFinal = diff > 0 ? construirAdicoes() : diff < 0 ? construirRemocoes() : sheet.classeHabilidades;
    const periciasFinal =
      diff > 0 && totalAlocado > 0
        ? sheet.pericias.map((p, i) => (alocPericias[i] ? { ...p, valor: String(num(p.valor, 0) + alocPericias[i]) } : p))
        : sheet.pericias;
    onApply({
      nivel: String(novoNivel),
      classeHabilidades: classeHabilidadesFinal,
      pericias: periciasFinal,
      pvDelta: 5 * diff,
      peDelta: 1 * diff,
    });
  }

  function handleContinuarRoot() {
    setErro(null);
    if (novoNivel < 1) {
      setErro("Nível mínimo é 1.");
      return;
    }
    if (diff === 0) {
      setErro("Já está nesse nível.");
      return;
    }
    if (diff > 0) {
      if (extraPH > 0) {
        setStep("habilidades");
        return;
      }
      if (bonusPericiaCount > 0) {
        setStep("pericias");
        return;
      }
      aplicar();
      return;
    }
    if (precisaRemover > 0) {
      setStep("habilidades");
      return;
    }
    aplicar();
  }

  function handleContinuarHabilidades() {
    setErro(null);
    if (diff > 0) {
      if (extraPH > 0 && usadoAgora === 0) {
        setErro("Escolha ao menos uma habilidade ou aprimoramento antes de continuar.");
        return;
      }
      if (bonusPericiaCount > 0) {
        setStep("pericias");
        return;
      }
      aplicar();
      return;
    }
    if (mantidos > newBudget) {
      setErro(`Ainda precisa abrir mão de mais ${mantidos - newBudget} habilidade(s)/aprimoramento(s).`);
      return;
    }
    aplicar();
  }

  function handleConfirmarPericias() {
    setErro(null);
    if (totalAlocado !== bonusPericiaCount) {
      setErro(`Distribua exatamente ${bonusPericiaCount} ponto(s) antes de continuar.`);
      return;
    }
    aplicar();
  }

  return (
    <Modal onClose={onCancel} wide>
      {step === "root" && (
        <>
          <div className="modal-title">🔧 Ajustar Nível</div>
          <div className="modal-message">
            Nível atual: <b>{oldNivel}</b>
          </div>
          <div className="field" style={{ marginBottom: 14, textAlign: "left" }}>
            <label>Novo nível</label>
            <input
              type="number"
              min={1}
              value={novoNivelStr}
              autoFocus
              onChange={(e) => setNovoNivelStr(e.target.value)}
            />
          </div>
          {diff > 0 && (
            <div className="modal-message">
              Subindo {diff} nível(is): PV/PE máximos sobem automaticamente (+{5 * diff} PV / +{diff} PE)
              {extraPH > 0 && (
                <>
                  , você ganha <b>{extraPH}</b> Ponto(s) de Habilidade novo(s) pra escolher
                </>
              )}
              {bonusPericiaCount > 0 && (
                <>
                  {" "}
                  e <b>{bonusPericiaCount}</b> Ponto(s) de Perícia livre(s)
                </>
              )}
              .
            </div>
          )}
          {diff < 0 && (
            <div className="modal-message">
              Descendo {-diff} nível(is): PV/PE máximos caem (-{5 * -diff} PV / -{-diff} PE).
              {precisaRemover > 0 && (
                <>
                  {" "}
                  Você precisa <b>abrir mão de {precisaRemover} habilidade(s)/aprimoramento(s)</b> pra caber no
                  orçamento de Pontos de Habilidade do nível {novoNivel}.
                </>
              )}
              <br />
              <i>Pontos de Perícia livres ganhos antes não são revertidos automaticamente — ajuste na aba Perícias se precisar.</i>
            </div>
          )}
          {erro && <p className="survival-warn">{erro}</p>}
          <div className="modal-options">
            <button type="button" className="btn" onClick={handleContinuarRoot}>
              Continuar
            </button>
          </div>
        </>
      )}

      {step === "habilidades" && diff > 0 && (
        <>
          <div className="modal-title">Novas Habilidades</div>
          <div className="wizard-class-buttons">
            {CLASSES_ORDENADAS.map((c) => (
              <button
                key={c}
                type="button"
                className={`wizard-class-btn ${classeAtual === c ? "active" : ""}`}
                onClick={() => setClasseAtual(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="ph-budget-bar">
            Pontos de Habilidade novos: <b>{usadoAgora} / {extraPH}</b>
          </div>
          {autoGrant.length > 0 && (
            <p className="derived-note">
              Ao escolher qualquer habilidade abaixo, você recebe automaticamente: <b>{autoGrant.join(", ")}</b>.
            </p>
          )}
          <input
            type="text"
            className="ability-search-input"
            placeholder="🔍 Buscar habilidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="wizard-ability-list lv-ability-list">
            {listaFiltrada.map((entry) => {
              const ownedBefore = isOwnedBase(sheet.classeHabilidades, entry.nome);
              const selNow = isSelecionadoBase(classeAtual, entry.nome);
              const baseDisabled = ownedBefore || (!selNow && usadoAgora >= extraPH);
              return (
                <div key={entry.nome} className="wizard-ability-block">
                  <label className="chk-inline">
                    <input
                      type="checkbox"
                      className="ability-select-checkbox"
                      checked={ownedBefore || selNow}
                      disabled={baseDisabled}
                      onChange={(e) => toggleBase(entry.nome, e.target.checked)}
                    />
                    <b>{entry.nome}</b> {ownedBefore && <i className="lv-owned-tag">(já possui)</i>} —{" "}
                    <span className="ability-meta">
                      {entry.tipo} · {entry.custo}
                    </span>
                  </label>
                  <div className="ability-desc">{entry.efeito}</div>
                  {(entry.aprimoramentos ?? []).length > 0 && (
                    <div className="wizard-aprim-list">
                      {(entry.aprimoramentos ?? []).map((ap, ai) => {
                        const apOwnedBefore = isOwnedAprimFor(sheet.classeHabilidades, entry.nome, ap.nome);
                        const apSelNow = isSelecionadoAprim(classeAtual, entry.nome, ai);
                        const podeEscolher = ownedBefore || selNow;
                        const apDisabled = apOwnedBefore || !podeEscolher || (!apSelNow && usadoAgora >= extraPH);
                        return (
                          <label key={ap.nome} className="chk-inline aprim-line">
                            <input
                              type="checkbox"
                              className="ability-select-checkbox"
                              checked={apOwnedBefore || apSelNow}
                              disabled={apDisabled}
                              onChange={(e) => toggleAprim(entry.nome, ai, e.target.checked)}
                            />
                            {ap.nome}: {ap.efeito} {apOwnedBefore && <i className="lv-owned-tag">(já possui)</i>}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {erro && <p className="survival-warn">{erro}</p>}
          <div className="modal-options" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost small" onClick={() => setStep("root")}>
              ← Voltar
            </button>
            <button type="button" className="btn" onClick={handleContinuarHabilidades}>
              {bonusPericiaCount > 0 ? "Próximo →" : "Confirmar e Aplicar"}
            </button>
          </div>
        </>
      )}

      {step === "habilidades" && diff < 0 && (
        <>
          <div className="modal-title">Abrir Mão de Habilidades</div>
          <div className="ph-budget-bar">
            Mantendo: <b>{mantidos} / {newBudget}</b> (orçamento do Nível {novoNivel})
          </div>
          <div className="wizard-ability-list lv-ability-list">
            {linhasAtuais.map((linha) => {
              const removida = removidos.has(linha.idx);
              const baseRemovida = linha.indent && linha.baseIdx !== null && removidos.has(linha.baseIdx);
              return (
                <label key={linha.idx} className={`chk-inline ${linha.indent ? "aprim-line" : ""}`} style={{ display: "block", marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    className="ability-select-checkbox"
                    checked={!removida}
                    disabled={baseRemovida}
                    onChange={(e) => toggleLinha(linha, e.target.checked)}
                  />
                  {linha.indent ? "↳ " : ""}
                  <b>{linha.nome}</b> <span className="ability-meta">({linha.classe})</span>
                </label>
              );
            })}
          </div>
          {erro && <p className="survival-warn">{erro}</p>}
          <div className="modal-options" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost small" onClick={() => setStep("root")}>
              ← Voltar
            </button>
            <button type="button" className="btn" onClick={handleContinuarHabilidades}>
              Confirmar e Aplicar
            </button>
          </div>
        </>
      )}

      {step === "pericias" && (
        <>
          <div className="modal-title">+{bonusPericiaCount} Ponto(s) de Perícia Livre(s)</div>
          <div className="modal-message">
            Distribua os pontos onde quiser — usados: <b>{totalAlocado}/{bonusPericiaCount}</b> (
            {Math.max(0, bonusPericiaCount - totalAlocado)} restando):
          </div>
          <div className="lv-pericia-grid">
            {sheet.pericias.map((p, i) => (
              <div key={p.nome} className="lv-pericia-opt" style={{ justifyContent: "space-between" }}>
                <span>
                  {p.nome} ({num(p.valor, 0) + alocPericias[i]})
                </span>
                <span className="counter">
                  <button type="button" className="counter-btn" disabled={alocPericias[i] <= 0} onClick={() => decPericia(i)}>
                    −
                  </button>
                  <span className="counter-val">{alocPericias[i]}</span>
                  <button
                    type="button"
                    className="counter-btn"
                    disabled={totalAlocado >= bonusPericiaCount}
                    onClick={() => incPericia(i)}
                  >
                    +
                  </button>
                </span>
              </div>
            ))}
          </div>
          {erro && <p className="survival-warn">{erro}</p>}
          <div className="modal-options" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost small" onClick={() => setStep(diff > 0 && extraPH > 0 ? "habilidades" : "root")}>
              ← Voltar
            </button>
            <button type="button" className="btn" onClick={handleConfirmarPericias}>
              Confirmar e Aplicar
            </button>
          </div>
        </>
      )}

      <button type="button" className="btn ghost small" onClick={onCancel} style={{ marginTop: 10 }}>
        Cancelar
      </button>
    </Modal>
  );
}
