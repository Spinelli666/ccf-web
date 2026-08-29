"use client";

import { useState } from "react";
import { num, clamp } from "@/lib/derived";
import { computeDerived } from "@/lib/derived";
import { AUTO_GRANT_ABILITIES, CLASSES_ORDENADAS, findAbilityClass } from "@/lib/classes-lookup";
import type { FullSheetData, HabilidadeClasse, HabilidadeRaca } from "@/lib/sheet-types";

const ALL_AUTO_GRANT_NAMES = Object.values(AUTO_GRANT_ABILITIES).flat();

export function AbilitiesPanel({
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
  const [classeFiltro, setClasseFiltro] = useState("Todas");
  const derived = computeDerived(sheet);
  const nome = sheet.name || "Personagem";

  function updateRaca(i: number, patch: Partial<HabilidadeRaca>) {
    const next = sheet.racaHabilidades.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ racaHabilidades: next });
  }
  function updateClasse(i: number, patch: Partial<HabilidadeClasse>) {
    const next = sheet.classeHabilidades.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ classeHabilidades: next });
  }

  function usarRaca(i: number) {
    const h = sheet.racaHabilidades[i];
    const max = num(h.usosDiarios, 0);
    if (max > 0 && h.usosGastos >= max) return;
    updateRaca(i, { usosGastos: h.usosGastos + 1 });
    onLog(`${nome} usou a habilidade racial "${h.nome}".`);
  }

  // Se a habilidade base tiver um aprimoramento ativo logo abaixo com custo próprio,
  // esse custo substitui o da habilidade base ao usar (mesma lógica do app original).
  function effectiveCost(i: number): number {
    const h = sheet.classeHabilidades[i];
    const next = sheet.classeHabilidades[i + 1];
    if (next && next.indent && next.ativo && next.custoPE !== "" && next.custoPE !== undefined) {
      return num(next.custoPE, num(h.custoPE, 0));
    }
    return num(h.custoPE, 0);
  }

  function usarClasse(i: number) {
    const h = sheet.classeHabilidades[i];
    const custoPE = effectiveCost(i);
    if (custoPE > 0) {
      const peAtual = clamp(num(sheet.stats.peAtual) - custoPE, 0, derived.peMax);
      onChange({ stats: { ...sheet.stats, peAtual: String(peAtual) } });
    }
    updateClasse(i, { usosGastos: h.usosGastos + 1 });
    onLog(`${nome} usou "${h.nome}"${custoPE ? ` (-${custoPE} PE)` : ""}.`);
  }

  const acaoTotal = clamp(num(sheet.acaoTotal, 4) || 4, 1, 12);
  const acaoBoxes = sheet.acaoBoxes && sheet.acaoBoxes.length >= acaoTotal
    ? sheet.acaoBoxes
    : Array.from({ length: acaoTotal }, (_, i) => sheet.acaoBoxes?.[i] ?? false);

  function toggleAcaoBox(i: number, checked: boolean) {
    const next = acaoBoxes.slice();
    if (checked) {
      for (let k = 0; k <= i; k++) next[k] = true;
    } else {
      for (let k = i; k < acaoTotal; k++) next[k] = false;
    }
    onChange({ acaoBoxes: next });
    onLog(`🔸 Pontos de Ação usados: ${next.filter(Boolean).length}/${acaoTotal}`);
  }

  function acaoNovoTurno() {
    onChange({ acaoBoxes: new Array(acaoTotal).fill(false) });
    onLog(`🔸 Novo turno — Pontos de Ação resetados`);
  }

  function acaoAdd() {
    const novo = clamp(acaoTotal + 1, 1, 12);
    onChange({ acaoTotal: novo, acaoBoxes: [...acaoBoxes, false] });
    onLog(`🔸 Ganhou +1 Ponto de Ação neste turno (total: ${novo})`);
  }

  function acaoRemove() {
    const novo = clamp(acaoTotal - 1, 1, 12);
    onChange({ acaoTotal: novo, acaoBoxes: acaoBoxes.slice(0, novo) });
  }

  // Cada linha não-indentada infere sua classe pelo catálogo; uma linha indentada
  // (aprimoramento) herda a classe da habilidade base logo acima — igual ao original.
  let currentClasseInfer: string | null = null;
  const classePairsComClasse = sheet.classeHabilidades.map((h, i) => {
    if (!h.indent) currentClasseInfer = findAbilityClass(h.nome) || "Outras";
    return { h, i, classe: currentClasseInfer as string };
  });
  const classesPresentes = [...CLASSES_ORDENADAS, "Outras"].filter((c) =>
    classePairsComClasse.some((p) => p.classe === c)
  );
  const classePairsFiltrados =
    classeFiltro === "Todas" ? classePairsComClasse : classePairsComClasse.filter((p) => p.classe === classeFiltro);

  const phPorClasse: Record<string, number> = {};
  classePairsComClasse.forEach(({ h, classe }) => {
    if (!h.nome || ALL_AUTO_GRANT_NAMES.includes(h.nome)) return;
    phPorClasse[classe] = (phPorClasse[classe] || 0) + 1;
  });

  return (
    <div className="section">
      <h2>Habilidades</h2>

      {sheet.racaTitulo && (
        <>
          <h3 className="form-section-title" style={{ color: "var(--maroon)", fontFamily: "Cinzel,serif", fontSize: 13 }}>
            Raça — {sheet.racaTitulo}
          </h3>
          {sheet.racaHabilidades.map((h, i) => {
            const max = num(h.usosDiarios, 0);
            return (
              <div key={i} className="ability">
                <div className="ability-row">
                  <div>
                    <b>{h.nome}</b>: {h.desc}
                  </div>
                  {isMine && max > 0 && (
                    <div className="ability-controls">
                      <span className="uses-count">
                        {h.usosGastos}/{max}
                      </span>
                      <button
                        type="button"
                        className={`tag-btn ${h.usosGastos < max ? "avail" : "used"}`}
                        disabled={h.usosGastos >= max}
                        onClick={() => usarRaca(i)}
                      >
                        Usar
                      </button>
                      {h.usosGastos > 0 && (
                        <button type="button" className="tag-btn" onClick={() => updateRaca(i, { usosGastos: 0 })}>
                          ↺
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {sheet.classeTitulo && (
        <>
          <h3 style={{ color: "var(--maroon)", fontFamily: "Cinzel,serif", fontSize: 13, marginTop: 18 }}>
            Habilidades de Classe{" "}
            {sheet.classePH && <span className="ph-tag">— {sheet.classePH} PH totais</span>}
          </h3>

          {Object.keys(phPorClasse).length > 0 && (
            <div className="ph-budget-bar">
              PH gastos por classe:{" "}
              {Object.entries(phPorClasse)
                .map(([c, n]) => `${c}: ${n}`)
                .join(" · ")}
            </div>
          )}

          <div className="action-points-bar">
            <span className="action-points-label">🔸 Pontos de Ação (turno atual)</span>
            <div className="cost-boxes">
              {Array.from({ length: acaoTotal }, (_, i) => (
                <input
                  key={i}
                  type="checkbox"
                  className="cost-box"
                  disabled={!isMine}
                  checked={!!acaoBoxes[i]}
                  onChange={(e) => toggleAcaoBox(i, e.target.checked)}
                />
              ))}
            </div>
            {isMine && (
              <>
                <button type="button" className="counter-btn" title="Adicionar Ponto de Ação" onClick={acaoAdd}>
                  +
                </button>
                <button type="button" className="counter-btn" title="Remover Ponto de Ação" onClick={acaoRemove}>
                  −
                </button>
                <button type="button" className="btn ghost small" onClick={acaoNovoTurno}>
                  Novo turno
                </button>
              </>
            )}
          </div>

          {classesPresentes.length > 1 && (
            <div className="classe-filter-buttons">
              <button
                type="button"
                className={`wizard-class-btn small ${classeFiltro === "Todas" ? "active" : ""}`}
                onClick={() => setClasseFiltro("Todas")}
              >
                Todas
              </button>
              {classesPresentes.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`wizard-class-btn small ${classeFiltro === c ? "active" : ""}`}
                  onClick={() => setClasseFiltro(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <table className="sheet-table">
            <thead>
              <tr>
                <th>Habilidade</th>
                <th>Tipo</th>
                <th>Custo</th>
                <th>Efeito</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {classePairsFiltrados.map(({ h, i }) =>
                h.indent ? (
                  <tr key={i} className="indent">
                    <td className="name">{h.nome}</td>
                    <td>{h.tipo}</td>
                    <td>{h.custo}</td>
                    <td>{h.efeito}</td>
                    <td>
                      {isMine && h.custoPE !== "" && h.custoPE !== undefined && (
                        <label className="chk-inline">
                          <input
                            type="checkbox"
                            checked={!!h.ativo}
                            onChange={(e) => updateClasse(i, { ativo: e.target.checked })}
                          />{" "}
                          aprendido
                        </label>
                      )}
                    </td>
                  </tr>
                ) : (
                  <tr key={i}>
                    <td className="name">{h.nome}</td>
                    <td>{h.tipo}</td>
                    <td>{h.custo}</td>
                    <td>{h.efeito}</td>
                    <td>
                      {isMine && (
                        <div className="ability-controls">
                          {h.temContador && (
                            <div className="counter">
                              <button
                                type="button"
                                className="counter-btn"
                                onClick={() => updateClasse(i, { contadorAtual: Math.max(0, h.contadorAtual - 1) })}
                              >
                                −
                              </button>
                              <span className="counter-val">
                                {h.contadorAtual}/{h.contadorMax}
                              </span>
                              <button
                                type="button"
                                className="counter-btn"
                                onClick={() =>
                                  updateClasse(i, {
                                    contadorAtual: Math.min(num(h.contadorMax, 99), h.contadorAtual + 1),
                                  })
                                }
                              >
                                +
                              </button>
                            </div>
                          )}
                          <button type="button" className="btn small secondary" onClick={() => usarClasse(i)}>
                            Usar{effectiveCost(i) ? ` (-${effectiveCost(i)}⚡)` : ""}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
