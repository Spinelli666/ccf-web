"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ABILITIES_LIBRARY, AUTO_GRANT_ABILITIES, CLASSES_ORDENADAS } from "@/lib/classes-lookup";
import { num } from "@/lib/derived";
import type { FullSheetData, HabilidadeClasse, Pericia } from "@/lib/sheet-types";

type Classe = (typeof CLASSES_ORDENADAS)[number];
type Selecao =
  | { tipo: "base"; classe: Classe; nome: string }
  | { tipo: "aprim"; classe: Classe; nome: string; ai: number };

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

export function LevelUpDialog({
  sheet,
  onApply,
  onCancel,
}: {
  sheet: FullSheetData;
  onApply: (patch: { nivel: string; classeHabilidades: HabilidadeClasse[]; pericias: Pericia[] }) => void;
  onCancel: () => void;
}) {
  const oldNivel = num(sheet.nivel, 1);
  const newNivel = oldNivel + 1;
  // Racial do Elfo ("Conhecimento Antigo"): +1 Ponto de Habilidade permanente, ganho no nível 1.
  const newBudget = newNivel + 1 + (sheet.racaTitulo === "Elfo" ? 1 : 0);
  const currentUsed = sheet.classeHabilidades.filter(
    (a) => a.nome && !Object.values(AUTO_GRANT_ABILITIES).flat().includes(a.nome)
  ).length;
  const extraPH = Math.max(0, newBudget - currentUsed);
  const ganhaPericiaExtra = newNivel % 3 === 0;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  // These aren't mutated locally — the dialog only reads them and collects
  // `novasSelecoes`; applyLevelUp() derives the final arrays from that.
  const classeHabilidades: HabilidadeClasse[] = sheet.classeHabilidades;
  const pericias: Pericia[] = sheet.pericias;
  const [classeAtual, setClasseAtual] = useState<Classe>(
    (CLASSES_ORDENADAS as readonly string[]).includes(sheet.classeTitulo)
      ? (sheet.classeTitulo as Classe)
      : CLASSES_ORDENADAS[0]
  );
  const [novasSelecoes, setNovasSelecoes] = useState<Selecao[]>([]);
  const [periciaBonusIdx, setPericiaBonusIdx] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [warn, setWarn] = useState<string | null>(null);

  const usadoAgora = novasSelecoes.length;
  const autoGrant = useMemo(() => AUTO_GRANT_ABILITIES[classeAtual] || [], [classeAtual]);
  const listaHabilidades = useMemo(
    () => (ABILITIES_LIBRARY[classeAtual] || []).filter((e) => !autoGrant.includes(e.nome)),
    [classeAtual, autoGrant]
  );
  const q = search.trim().toLowerCase();
  const listaFiltrada = q
    ? listaHabilidades.filter((e) => (e.nome + " " + e.efeito).toLowerCase().includes(q))
    : listaHabilidades;

  function isSelecionadoBase(classe: Classe, nome: string) {
    return novasSelecoes.some((sel) => sel.tipo === "base" && sel.classe === classe && sel.nome === nome);
  }
  function isSelecionadoAprim(classe: Classe, nome: string, ai: number) {
    return novasSelecoes.some((sel) => sel.tipo === "aprim" && sel.classe === classe && sel.nome === nome && sel.ai === ai);
  }

  function toggleBase(nome: string, checked: boolean) {
    if (checked) {
      setNovasSelecoes((prev) => [...prev, { tipo: "base", classe: classeAtual, nome }]);
    } else {
      setNovasSelecoes((prev) =>
        prev.filter((sel) => !(sel.tipo === "base" && sel.classe === classeAtual && sel.nome === nome))
      );
    }
  }
  function toggleAprim(nome: string, ai: number, checked: boolean) {
    if (checked) {
      setNovasSelecoes((prev) => [...prev, { tipo: "aprim", classe: classeAtual, nome, ai }]);
    } else {
      setNovasSelecoes((prev) =>
        prev.filter((sel) => !(sel.tipo === "aprim" && sel.classe === classeAtual && sel.nome === nome && sel.ai === ai))
      );
    }
  }

  function applyLevelUp() {
    const draft = JSON.parse(JSON.stringify(classeHabilidades)) as HabilidadeClasse[];
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
            custoPE: "custoPE" in ap && ap.custoPE !== undefined ? String(ap.custoPE) : "",
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

    const newPericias = JSON.parse(JSON.stringify(pericias)) as Pericia[];
    if (ganhaPericiaExtra && periciaBonusIdx !== null) {
      newPericias[periciaBonusIdx].valor = String(num(newPericias[periciaBonusIdx].valor, 0) + 1);
    }

    onApply({ nivel: String(newNivel), classeHabilidades: draft, pericias: newPericias });
  }

  function handleNext() {
    setWarn(null);
    if (step === 2) {
      if (extraPH > 0 && novasSelecoes.length === 0) {
        setWarn("Escolha ao menos uma habilidade ou aprimoramento antes de continuar.");
        return;
      }
      if (ganhaPericiaExtra) {
        setStep(3);
        return;
      }
      applyLevelUp();
      return;
    }
    if (step === 3) {
      if (periciaBonusIdx === null) {
        setWarn("Escolha em qual perícia colocar o ponto extra.");
        return;
      }
      applyLevelUp();
      return;
    }
    setStep(2);
  }

  return (
    <Modal onClose={onCancel} wide>
      {step === 1 && (
        <>
          <div className="modal-title">🎉 Subir para o Nível {newNivel}!</div>
          <div className="modal-message">
            Você atingiu 100 XP. Ao subir de nível:
            <br />
            <br />
            • PV e PE máximos aumentam automaticamente (+5 PV / +1 PE)
            <br />
            • +1 Ponto de Habilidade pra gastar em qualquer classe
            <br />
            {ganhaPericiaExtra && "• +1 Ponto de Perícia livre (a cada 3 Níveis)"}
          </div>
          <div className="modal-options">
            <button type="button" className="btn" onClick={() => setStep(2)}>
              Continuar
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="modal-title">Nova Habilidade</div>
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
              const ownedBefore = isOwnedBase(classeHabilidades, entry.nome);
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
                    <b>{entry.nome}</b> {ownedBefore && <i className="lv-owned-tag">(já possui)</i>} — {" "}
                    <span className="ability-meta">
                      {entry.tipo} · {entry.custo}
                    </span>
                  </label>
                  <div className="ability-desc">{entry.efeito}</div>
                  {(entry.aprimoramentos ?? []).length > 0 && (
                    <div className="wizard-aprim-list">
                      {(entry.aprimoramentos ?? []).map((ap, ai) => {
                        const apOwnedBefore = isOwnedAprimFor(classeHabilidades, entry.nome, ap.nome);
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
          {warn && <p className="survival-warn">{warn}</p>}
          <div className="modal-options" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost small" onClick={() => setStep(1)}>
              ← Voltar
            </button>
            <button type="button" className="btn" onClick={handleNext}>
              {ganhaPericiaExtra ? "Próximo →" : "Confirmar e Aplicar"}
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="modal-title">+1 Ponto de Perícia Livre</div>
          <div className="modal-message">
            A cada 3 Níveis você ganha 1 Ponto de Perícia pra distribuir onde quiser. Escolha em qual perícia colocar:
          </div>
          <div className="lv-pericia-grid">
            {pericias.map((p, i) => (
              <label key={p.nome} className="lv-pericia-opt">
                <input
                  type="radio"
                  name="lv-pericia-pick"
                  checked={periciaBonusIdx === i}
                  onChange={() => setPericiaBonusIdx(i)}
                />
                {p.nome} ({p.valor})
              </label>
            ))}
          </div>
          {warn && <p className="survival-warn">{warn}</p>}
          <div className="modal-options" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost small" onClick={() => setStep(2)}>
              ← Voltar
            </button>
            <button type="button" className="btn" onClick={handleNext}>
              Confirmar e Aplicar
            </button>
          </div>
        </>
      )}

      <button type="button" className="btn ghost small" onClick={onCancel}>
        Cancelar
      </button>
    </Modal>
  );
}
