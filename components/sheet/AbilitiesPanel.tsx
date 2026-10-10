"use client";

import { Fragment, useEffect, useState, useSyncExternalStore } from "react";
import { num, clamp, getPericiaBonuses } from "@/lib/derived";
import { computeDerived } from "@/lib/derived";
import { AUTO_GRANT_ABILITIES, CLASSE_UNICA, classeDaHabilidade, custoComDiamante, findAbilityEntry } from "@/lib/classes-lookup";
import { EffectText } from "@/components/sheet/EffectText";
import { TipoAcaoBadge } from "@/components/sheet/TipoAcaoBadge";
import { AcaoDialog } from "@/components/dialogs/AcaoDialog";
import { EditHabilidadeDialog } from "@/components/dialogs/EditHabilidadeDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import type { DerivedStats } from "@/lib/derived";
import type { FullSheetData, HabilidadeClasse, HabilidadeRaca } from "@/lib/sheet-types";

type AprimTier = { nome: string; efeito: string; idx: number | null };

const ALL_AUTO_GRANT_NAMES = Object.values(AUTO_GRANT_ABILITIES).flat();

// Ponto de partida do "+ Criar Habilidade".
const HABILIDADE_NOVA: HabilidadeClasse = {
  nome: "",
  tipo: "",
  custo: "",
  custoPE: "",
  efeito: "",
  indent: false,
  ativo: true,
  usosGastos: 0,
  temContador: false,
  contadorMax: "",
  contadorAtual: 0,
  classe: CLASSE_UNICA,
};

// Botões de classe acima da tabela de habilidades (ordem e ícones pedidos pro jogo).
// "Única" agrupa as habilidades criadas à mão / fora do catálogo de classes.
const CLASSE_BOTOES: { classe: string; icone: string }[] = [
  { classe: CLASSE_UNICA, icone: "🌟🟡" },
  { classe: "Guerreiro", icone: "⚔️🔴" },
  { classe: "Andarilho", icone: "🏹🟢" },
  { classe: "Ladino", icone: "🗡️🟣" },
  { classe: "Feiticeiro", icone: "🌀🔵" },
];

// A seleção de classes visíveis é só uma preferência de visualização de quem está
// olhando a ficha — fica no localStorage do navegador, por ficha.
function storageKey(sheetId: string) {
  // v2: a categoria "Única" entrou como botão — seleções antigas não a conheciam.
  return `ccf:habilidades-classes:v2:${sheetId}`;
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
      sheet.classeHabilidades.some((h) => !h.indent && classeDaHabilidade(h) === c)
    );
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [criando, setCriando] = useState(false);
  const [excluindoIdx, setExcluindoIdx] = useState<number | null>(null);
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());
  const [aprimAbertas, setAprimAbertas] = useState<Set<number>>(new Set());
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
    setAprimAbertas(new Set());
  }
  // Os aprimoramentos editados no diálogo substituem as linhas indentadas logo abaixo da base.
  function salvarEdicao(i: number, patch: Partial<HabilidadeClasse>, aprims: HabilidadeClasse[]) {
    const h = sheet.classeHabilidades[i];
    const antigos = qtdAprimoramentosAbaixo(i);
    const next = [
      ...sheet.classeHabilidades.slice(0, i),
      { ...h, ...patch },
      ...(h.indent ? [] : aprims),
      ...sheet.classeHabilidades.slice(i + 1 + antigos),
    ];
    onChange({ classeHabilidades: next });
    // Cards abertos mais abaixo mudam de índice se a quantidade de aprimoramentos mudou.
    const delta = h.indent ? 0 : aprims.length - antigos;
    if (delta) {
      const desloca = (set: Set<number>) => new Set([...set].map((k) => (k > i ? k + delta : k)));
      setExpandidas(desloca(expandidas));
      setAprimAbertas(desloca(aprimAbertas));
    }
    setEditandoIdx(null);
  }

  function criarHabilidade(nova: HabilidadeClasse, aprims: HabilidadeClasse[]) {
    const cat = nova.classe || CLASSE_UNICA;
    onChange({ classeHabilidades: [...sheet.classeHabilidades, nova, ...aprims] });
    onLog(`${nome} criou a habilidade "${nova.nome}" (${cat}).`);
    // Mostra a categoria da habilidade nova, se ela estava escondida no filtro.
    if (!classesSelecionadas.includes(cat)) salvarClasses(sheetId, [...classesSelecionadas, cat]);
    setCriando(false);
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

  // Se a habilidade base tiver um aprimoramento logo abaixo com custo próprio, esse custo
  // substitui o da habilidade base ao usar. Estar na tabela já significa aprendido.
  function effectiveCost(i: number): number {
    const h = sheet.classeHabilidades[i];
    const next = sheet.classeHabilidades[i + 1];
    if (next && next.indent && next.custoPE !== "" && next.custoPE !== undefined) {
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
    onLog(`🔶 Pontos de Ação usados: ${next.filter(Boolean).length}/${acaoTotal}`);
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
      `🔶 ${nome} usou uma Ação ${tipo === "curta" ? "Curta" : "Longa"}: ${opcao} (${usados + custo}/${acaoTotal})`
    );
  }

  function acaoAdd() {
    const novo = clamp(acaoTotal + 1, 1, 12);
    onChange({ acaoTotal: novo, acaoBoxes: [...acaoBoxes, false] });
    onLog(`🔶 Ganhou +1 Ponto de Ação neste turno (total: ${novo})`);
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

  function toggleAprim(i: number) {
    const next = new Set(aprimAbertas);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setAprimAbertas(next);
  }

  // Os aprimoramentos aprendidos de uma habilidade base aparecem como linhas indentadas
  // logo em seguida a ela (ver rebuildClasseHabilidades no wizard). No card, cada tier do
  // catálogo (I/II/III) vira um número: com `idx` = linha da ficha se aprendido, null se não.
  function tiersDoAprimoramento(base: number, aprims: number[]): AprimTier[] {
    const entry = findAbilityEntry(sheet.classeHabilidades[base].nome);
    const usados = new Set<number>();
    const tiers: AprimTier[] = (entry?.aprimoramentos || []).map((ap) => {
      const idx = aprims.find((k) => !usados.has(k) && sheet.classeHabilidades[k].nome === ap.nome) ?? null;
      if (idx !== null) usados.add(idx);
      return { nome: ap.nome, efeito: idx !== null ? sheet.classeHabilidades[idx].efeito : ap.efeito, idx };
    });
    // Aprimoramentos fora do catálogo (criados ou renomeados à mão) entram no fim, aprendidos.
    aprims
      .filter((k) => !usados.has(k))
      .forEach((k) => {
        const row = sheet.classeHabilidades[k];
        tiers.push({ nome: row.nome, efeito: row.efeito, idx: k });
      });
    return tiers;
  }

  // Cada linha não-indentada infere sua classe pelo catálogo; uma linha indentada
  // (aprimoramento) herda a classe da habilidade base logo acima — igual ao original.
  const classePairsComClasse: { h: HabilidadeClasse; i: number; classe: string }[] = [];
  for (let i = 0; i < sheet.classeHabilidades.length; i++) {
    const h = sheet.classeHabilidades[i];
    const anterior = classePairsComClasse[i - 1]?.classe ?? CLASSE_UNICA;
    classePairsComClasse.push({ h, i, classe: h.indent ? anterior : classeDaHabilidade(h) });
  }
  // Cada habilidade base vira um card; os aprimoramentos dela (linhas indentadas logo
  // abaixo) entram no mesmo card.
  const grupos: { base: number; aprims: number[]; classe: string }[] = [];
  classePairsComClasse.forEach(({ h, i, classe }) => {
    const ultimo = grupos[grupos.length - 1];
    if (h.indent && ultimo) ultimo.aprims.push(i);
    else grupos.push({ base: i, aprims: [], classe });
  });
  const gruposFiltrados = grupos.filter((g) => classesSelecionadas.includes(g.classe));

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
          <h3 className="sub-title">
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
          <h3 className="sub-title">
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
            <span className="action-points-label">🔶 Pontos de Ação (turno atual)</span>
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
          {isMine && (
            <div className="hab-criar-row">
              <button type="button" className="btn small" onClick={() => setCriando(true)}>
                + Criar Habilidade
              </button>
            </div>
          )}

          {classesSelecionadas.length === 0 ? (
            <div className="derived-note" style={{ textAlign: "center" }}>
              Selecione uma classe acima para ver as habilidades.
            </div>
          ) : (
          <div className="hab-grid">
            {gruposFiltrados.map(({ base, aprims, classe }) => {
              const h = sheet.classeHabilidades[base];
              const aberta = expandidas.has(base);
              const aprimAberto = aprimAbertas.has(base);
              const tiers = tiersDoAprimoramento(base, aprims);
              const icone = CLASSE_BOTOES.find((b) => b.classe === classe)?.icone;
              return (
                <div key={base} className="hab-card">
                  <div className="hab-head">
                    <span className="hab-classe" title={classe}>
                      {icone}
                    </span>
                    <button
                      type="button"
                      className="hab-nome"
                      aria-expanded={aberta}
                      title={aberta ? "Esconder descrição" : "Ver descrição"}
                      onClick={() => toggleExpandida(base)}
                    >
                      {h.nome}
                    </button>
                    <div className="hab-acoes">{isMine && linhaBotoes(base)}</div>
                  </div>
                  {aberta && (
                    <div className="hab-desc">
                      <EffectText text={h.efeito} />
                    </div>
                  )}

                  <div className="hab-linha hab-meta">
                    <TipoAcaoBadge tipo={h.tipo} />
                    <span className="hab-sep" aria-hidden="true" />
                    <span className="hab-custo">{custoComDiamante(h.custo) || "—"}</span>
                  </div>
                  {getPericiaBonuses(h).length > 0 && (
                    <div className="hab-linha hab-bonus">
                      {getPericiaBonuses(h).map((b, k) => (
                        <span key={k} className="hab-bonus-chip">
                          🎯 +{num(b.valor, 0)} {b.pericia}
                        </span>
                      ))}
                    </div>
                  )}

                  {tiers.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="hab-linha hab-aprim"
                        aria-expanded={aprimAberto}
                        title={aprimAberto ? "Esconder aprimoramentos" : "Ver aprimoramentos"}
                        onClick={() => toggleAprim(base)}
                      >
                        Aprimoramentos
                        <span className={`hab-aprim-seta ${aprimAberto ? "open" : ""}`}>▸</span>
                        <span className="hab-tiers">
                          {tiers.map((t, k) => (
                            <Fragment key={k}>
                              {k > 0 && <span className="hab-tier-sep" aria-hidden="true" />}
                              <span
                                className={`hab-tier ${t.idx !== null ? "learned" : ""}`}
                                title={`${t.nome}${t.idx !== null ? " (aprendido)" : " (não aprendido)"}`}
                              >
                                {k + 1}
                              </span>
                            </Fragment>
                          ))}
                        </span>
                      </button>
                      {aprimAberto && (
                        <div className="hab-aprim-lista">
                          {tiers.some((t) => t.idx !== null) ? (
                            tiers.map((t, k) =>
                              t.idx === null ? null : (
                                <div key={k} className="hab-aprim-item">
                                  <div className="hab-aprim-item-head">
                                    <span className="hab-tier learned">{k + 1}</span>
                                    <span className="hab-aprim-nome">{t.nome}</span>
                                  </div>
                                  <EffectText text={t.efeito} />
                                </div>
                              )
                            )
                          ) : (
                            <div className="hab-aprim-vazio">Nenhum aprimoramento aprendido ainda.</div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {isMine && (
                    <div className="hab-linha hab-usar">
                      {h.temContador && (
                        <div className="counter">
                          <button
                            type="button"
                            className="counter-btn"
                            onClick={() => updateClasse(base, { contadorAtual: Math.max(0, h.contadorAtual - 1) })}
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
                              updateClasse(base, {
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
                        className="hab-usar-btn"
                        title={effectiveCost(base) ? `Usar (-${effectiveCost(base)}⚡)` : "Usar"}
                        aria-label="Usar"
                        onClick={() => usarClasse(base)}
                      >
                        ✨
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </>
      )}

      {editandoIdx !== null && sheet.classeHabilidades[editandoIdx] && (
        <EditHabilidadeDialog
          habilidade={sheet.classeHabilidades[editandoIdx]}
          aprimoramentos={sheet.classeHabilidades.slice(editandoIdx + 1, editandoIdx + 1 + qtdAprimoramentosAbaixo(editandoIdx))}
          onSave={(patch, aprims) => salvarEdicao(editandoIdx, patch, aprims)}
          onCancel={() => setEditandoIdx(null)}
        />
      )}
      {criando && (
        <EditHabilidadeDialog
          criando
          habilidade={HABILIDADE_NOVA}
          onSave={(patch, aprims) => criarHabilidade({ ...HABILIDADE_NOVA, ...patch }, aprims)}
          onCancel={() => setCriando(false)}
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
