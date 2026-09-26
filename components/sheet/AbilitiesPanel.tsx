"use client";

import { Fragment, useEffect, useState, useSyncExternalStore } from "react";
import { num, clamp } from "@/lib/derived";
import { computeDerived } from "@/lib/derived";
import { AUTO_GRANT_ABILITIES, findAbilityClass, findAbilityEntry } from "@/lib/classes-lookup";
import { EffectText } from "@/components/sheet/EffectText";
import { AcaoDialog } from "@/components/dialogs/AcaoDialog";
import { EditHabilidadeDialog } from "@/components/dialogs/EditHabilidadeDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import type { DerivedStats } from "@/lib/derived";
import type { FullSheetData, HabilidadeClasse, HabilidadeRaca } from "@/lib/sheet-types";

const ALL_AUTO_GRANT_NAMES = Object.values(AUTO_GRANT_ABILITIES).flat();

// Botões de classe acima da tabela de habilidades (ordem e ícones pedidos pro jogo).
const CLASSE_BOTOES: { classe: string; icone: string }[] = [
  { classe: "Guerreiro", icone: "⚔️🔴" },
  { classe: "Andarilho", icone: "🏹🟢" },
  { classe: "Ladino", icone: "🗡️🟣" },
  { classe: "Feiticeiro", icone: "🌀🔵" },
];

// A seleção de classes visíveis é só uma preferência de visualização de quem está
// olhando a ficha — fica no localStorage do navegador, por ficha.
function storageKey(sheetId: string) {
  return `ccf:habilidades-classes:${sheetId}`;
}
const classesListeners = new Set<() => void>();
function subscribeClasses(listener: () => void) {
  classesListeners.add(listener);
  return () => classesListeners.delete(listener);
}
// Guarda em memória também, pra seleção funcionar mesmo sem localStorage (aba privada etc.).
const classesMemoria = new Map<string, string>();
function lerClassesRaw(sheetId: string): string | null {
  try {
    const raw = window.localStorage.getItem(storageKey(sheetId));
    if (raw !== null) return raw;
  } catch {
    // sem localStorage — cai pro valor em memória
  }
  return classesMemoria.get(sheetId) ?? null;
}
function parseClasses(raw: string | null): string[] | null {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : null;
  } catch {
    return null;
  }
}
function salvarClasses(sheetId: string, classes: string[]) {
  const raw = JSON.stringify(classes);
  classesMemoria.set(sheetId, raw);
  try {
    window.localStorage.setItem(storageKey(sheetId), raw);
  } catch {
    // sem localStorage — fica só em memória
  }
  classesListeners.forEach((l) => l());
}

// Racial do Anão ("Sangue Fervente"): 1 uso/dia base +1 a cada 2 pontos de Vigor
// (o texto da regra pede pra "ajustar os usos por dia conforme o Vigor"; calculamos
// isso na hora em vez de gravar um número fixo na ficha, pra acompanhar o Vigor atual).
function usosDiariosEfetivo(h: HabilidadeRaca, derived: DerivedStats): number {
  if (h.nome === "Sangue Fervente") {
    return 1 + Math.floor(derived.vigor / 2);
  }
  return num(h.usosDiarios, 0);
}

export function AbilitiesPanel({
  sheet,
  sheetId,
  isMine,
  onChange,
  onLog,
}: {
  sheet: FullSheetData;
  sheetId: string;
  isMine: boolean;
  onChange: (patch: Partial<FullSheetData>) => void;
  onLog: (text: string) => void;
}) {
  // Classes marcadas nos botões acima da tabela. Sem nada salvo, começa com as classes
  // que o personagem já tem, pra tabela não aparecer vazia na primeira vez.
  const classesRaw = useSyncExternalStore(
    subscribeClasses,
    () => lerClassesRaw(sheetId),
    () => null
  );
  const classesSelecionadas =
    parseClasses(classesRaw) ??
    CLASSE_BOTOES.map((b) => b.classe).filter((c) =>
      sheet.classeHabilidades.some((h) => !h.indent && findAbilityClass(h.nome) === c)
    );
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [excluindoIdx, setExcluindoIdx] = useState<number | null>(null);
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());
  const [showAcao, setShowAcao] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
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

  function toggleClasse(classe: string) {
    const next = classesSelecionadas.includes(classe)
      ? classesSelecionadas.filter((c) => c !== classe)
      : [...classesSelecionadas, classe];
    salvarClasses(sheetId, next);
  }

  // Excluir uma habilidade base leva junto os aprimoramentos dela (linhas indentadas
  // logo abaixo) — senão eles "grudariam" na habilidade de cima.
  function qtdAprimoramentosAbaixo(i: number): number {
    if (sheet.classeHabilidades[i]?.indent) return 0;
    let n = 0;
    for (let k = i + 1; k < sheet.classeHabilidades.length && sheet.classeHabilidades[k].indent; k++) n++;
    return n;
  }
  function excluirHabilidade(i: number) {
    const h = sheet.classeHabilidades[i];
    const extras = qtdAprimoramentosAbaixo(i);
    const next = sheet.classeHabilidades.filter((_, k) => k < i || k > i + extras);
    onChange({ classeHabilidades: next });
    onLog(`${nome} removeu ${h.indent ? "o aprimoramento" : "a habilidade"} "${h.nome}" da ficha.`);
    setExcluindoIdx(null);
    setExpandidas(new Set());
  }
  function salvarEdicao(i: number, patch: Partial<HabilidadeClasse>) {
    updateClasse(i, patch);
    setEditandoIdx(null);
  }

  function linhaBotoes(i: number) {
    return (
      <>
        <button type="button" className="icon-btn" title="Editar" aria-label="Editar" onClick={() => setEditandoIdx(i)}>
          ✏️
        </button>
        <button type="button" className="icon-btn is-danger" title="Excluir" aria-label="Excluir" onClick={() => setExcluindoIdx(i)}>
          🗑️
        </button>
      </>
    );
  }

  function usarRaca(i: number) {
    const h = sheet.racaHabilidades[i];
    const max = usosDiariosEfetivo(h, derived);
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

  // Aviso de "Pontos de Ação insuficientes" é só local (nunca vai pro chat/socket) —
  // só o próprio jogador vê, some sozinho depois de um tempo.
  useEffect(() => {
    if (!erroAcao) return;
    const t = setTimeout(() => setErroAcao(null), 5000);
    return () => clearTimeout(t);
  }, [erroAcao]);

  function escolherAcao(tipo: "curta" | "longa", opcao: string) {
    setShowAcao(false);
    const custo = tipo === "curta" ? 1 : 2;
    const usados = acaoBoxes.filter(Boolean).length;
    if (usados + custo > acaoTotal) {
      setErroAcao(
        `Pontos de Ação insuficientes para uma Ação ${tipo === "curta" ? "Curta" : "Longa"} (precisa de ${custo}, restam ${Math.max(0, acaoTotal - usados)}).`
      );
      return;
    }
    const next = acaoBoxes.slice();
    for (let k = usados; k < usados + custo; k++) next[k] = true;
    onChange({ acaoBoxes: next });
    onLog(
      `🔸 ${nome} usou uma Ação ${tipo === "curta" ? "Curta" : "Longa"}: ${opcao} (${usados + custo}/${acaoTotal})`
    );
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

  function toggleExpandida(i: number) {
    const next = new Set(expandidas);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setExpandidas(next);
  }

  // Os aprimoramentos aprendidos de uma habilidade base aparecem como linhas indentadas
  // logo em seguida a ela (ver rebuildClasseHabilidades no wizard) — usado só pra marcar
  // quais tiers do catálogo (I/II/III) o personagem já tem.
  function aprimoramentosAprendidos(baseIndex: number): Set<string> {
    const nomes = new Set<string>();
    for (let k = baseIndex + 1; k < sheet.classeHabilidades.length; k++) {
      const row = sheet.classeHabilidades[k];
      if (!row.indent) break;
      nomes.add(row.nome);
    }
    return nomes;
  }

  // Cada linha não-indentada infere sua classe pelo catálogo; uma linha indentada
  // (aprimoramento) herda a classe da habilidade base logo acima — igual ao original.
  const classePairsComClasse: { h: HabilidadeClasse; i: number; classe: string }[] = [];
  for (let i = 0; i < sheet.classeHabilidades.length; i++) {
    const h = sheet.classeHabilidades[i];
    const anterior = classePairsComClasse[i - 1]?.classe ?? "Outras";
    classePairsComClasse.push({ h, i, classe: h.indent ? anterior : findAbilityClass(h.nome) || "Outras" });
  }
  // Habilidades fora do catálogo ("Outras") aparecem junto sempre que alguma classe estiver marcada.
  const classePairsFiltrados = classePairsComClasse.filter(
    (p) => classesSelecionadas.includes(p.classe) || (p.classe === "Outras" && classesSelecionadas.length > 0)
  );

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
          <h3 className="form-section-title" style={{ color: "var(--maroon)", fontSize: 13 }}>
            Raça — {sheet.racaTitulo}
          </h3>
          {sheet.racaHabilidades.map((h, i) => {
            const max = usosDiariosEfetivo(h, derived);
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
                        title="Usar"
                        aria-label="Usar"
                        disabled={h.usosGastos >= max}
                        onClick={() => usarRaca(i)}
                      >
                        ✨
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
          <h3 style={{ color: "var(--maroon)", fontSize: 13, marginTop: 18 }}>
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
                <button type="button" className="btn ghost small" onClick={() => setShowAcao(true)}>
                  Utilizar
                </button>
              </>
            )}
          </div>
          {erroAcao && (
            <div className="acao-erro-banner">
              ⚠️ {erroAcao}
              <button type="button" className="acao-erro-close" onClick={() => setErroAcao(null)}>
                ×
              </button>
            </div>
          )}

          <div className="classe-filter-buttons classe-emoji-buttons">
            {CLASSE_BOTOES.map(({ classe, icone }) => {
              const ativa = classesSelecionadas.includes(classe);
              return (
                <button
                  key={classe}
                  type="button"
                  className={`wizard-class-btn classe-emoji-btn ${ativa ? "active" : ""}`}
                  title={classe}
                  aria-label={classe}
                  aria-pressed={ativa}
                  onClick={() => toggleClasse(classe)}
                >
                  {icone}
                </button>
              );
            })}
          </div>

          {classesSelecionadas.length === 0 ? (
            <div className="derived-note" style={{ textAlign: "center" }}>
              Selecione uma classe acima para ver as habilidades.
            </div>
          ) : (
          <div className="sheet-table-wrap">
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Habilidade</th>
                <th>Tipo</th>
                <th>Custo</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {classePairsFiltrados.map(({ h, i }) => {
                const aberta = expandidas.has(i);
                const nomeCell = (
                  <td className="name">
                    <span
                      className="ability-name-toggle"
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleExpandida(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleExpandida(i);
                        }
                      }}
                    >
                      <span className={`ability-name-arrow ${aberta ? "open" : ""}`}>▶</span>
                      {h.nome}
                    </span>
                  </td>
                );
                return h.indent ? (
                  <Fragment key={i}>
                    <tr className="indent">
                      {nomeCell}
                      <td className="col-tight">{h.tipo}</td>
                      <td className="col-tight">{h.custo}</td>
                      <td className="col-tight">
                        {isMine && (
                        <div className="ability-controls">
                        {h.custoPE !== "" && h.custoPE !== undefined && (
                          <label className="chk-inline">
                            <input
                              type="checkbox"
                              checked={!!h.ativo}
                              onChange={(e) => {
                                updateClasse(i, { ativo: e.target.checked });
                                onLog(
                                  `${nome} marcou "${h.nome}" como ${e.target.checked ? "aprendido" : "não aprendido"}`
                                );
                              }}
                            />{" "}
                            aprendido
                          </label>
                        )}
                        {linhaBotoes(i)}
                        </div>
                        )}
                      </td>
                    </tr>
                    {aberta && (
                      <tr className="ability-effect-row">
                        <td colSpan={4}>
                          <EffectText text={h.efeito} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ) : (
                  <Fragment key={i}>
                    <tr>
                      {nomeCell}
                      <td className="col-tight">{h.tipo}</td>
                      <td className="col-tight">{h.custo}</td>
                      <td className="col-tight">
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
                            <button
                              type="button"
                              className="btn small secondary emoji-btn"
                              title={effectiveCost(i) ? `Usar (-${effectiveCost(i)}⚡)` : "Usar"}
                              aria-label="Usar"
                              onClick={() => usarClasse(i)}
                            >
                              ✨
                            </button>
                            {linhaBotoes(i)}
                          </div>
                        )}
                      </td>
                    </tr>
                    {aberta &&
                      (() => {
                        const entry = findAbilityEntry(h.nome);
                        const aprendidos = aprimoramentosAprendidos(i);
                        const aprimorAprendidos = (entry?.aprimoramentos || []).filter((ap) => aprendidos.has(ap.nome));
                        return (
                          <tr className="ability-effect-row">
                            <td colSpan={4}>
                              <EffectText text={h.efeito} />
                              {aprimorAprendidos.length > 0 && (
                                <div className="ability-aprim-list">
                                  <div className="ability-aprim-title">Aprimoramentos aprendidos</div>
                                  {aprimorAprendidos.map((ap) => (
                                    <div key={ap.nome} className="ability-aprim-item learned">
                                      <span className="ability-aprim-tag">✓ {ap.nome}</span>
                                      <EffectText text={ap.efeito} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })()}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
          )}
        </>
      )}

      {editandoIdx !== null && sheet.classeHabilidades[editandoIdx] && (
        <EditHabilidadeDialog
          habilidade={sheet.classeHabilidades[editandoIdx]}
          onSave={(patch) => salvarEdicao(editandoIdx, patch)}
          onCancel={() => setEditandoIdx(null)}
        />
      )}
      {excluindoIdx !== null && sheet.classeHabilidades[excluindoIdx] && (
        <ConfirmDialog
          title="Excluir habilidade"
          message={
            qtdAprimoramentosAbaixo(excluindoIdx) > 0
              ? `Excluir "${sheet.classeHabilidades[excluindoIdx].nome}" e ${
                  qtdAprimoramentosAbaixo(excluindoIdx) === 1
                    ? "o aprimoramento dela"
                    : `os ${qtdAprimoramentosAbaixo(excluindoIdx)} aprimoramentos dela`
                } da ficha?`
              : `Excluir "${sheet.classeHabilidades[excluindoIdx].nome}" da ficha?`
          }
          confirmLabel="🗑️ Excluir"
          onConfirm={() => excluirHabilidade(excluindoIdx)}
          onCancel={() => setExcluindoIdx(null)}
        />
      )}

      {showAcao && <AcaoDialog onEscolher={escolherAcao} onCancel={() => setShowAcao(false)} />}
    </div>
  );
}
