"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { Markdown, toggleTaskLine } from "@/components/notes/Markdown";

export type Pagina = { id: string; cadernoId: string; titulo: string; conteudo: string; ordem: number };
export type Caderno = { id: string; titulo: string; publico: boolean; ordem: number; paginas: Pagina[] };

type Modo = "editar" | "ler" | "dividir";
type Excluindo = { tipo: "caderno"; id: string; titulo: string } | { tipo: "pagina"; id: string; titulo: string };
type Status = "salvo" | "salvando" | "erro";

const SAVE_DELAY = 700;

const TITULO_RE = /^#{1,3}\s+/;

type FerramentaId = "h1" | "h2" | "h3" | "b" | "i" | "s" | "ul" | "ol" | "task" | "quote" | "code" | "link" | "hr";
const FERRAMENTAS: { id: FerramentaId; label: string; title: string }[] = [
  { id: "h1", label: "H1", title: "Título grande" },
  { id: "h2", label: "H2", title: "Título médio" },
  { id: "h3", label: "H3", title: "Título pequeno" },
  { id: "b", label: "B", title: "Negrito (Ctrl+B)" },
  { id: "i", label: "I", title: "Itálico (Ctrl+I)" },
  { id: "s", label: "S", title: "Riscado" },
  { id: "ul", label: "•", title: "Lista" },
  { id: "ol", label: "1.", title: "Lista numerada" },
  { id: "task", label: "☑", title: "Lista de tarefas" },
  { id: "quote", label: "❝", title: "Citação" },
  { id: "code", label: "</>", title: "Código" },
  { id: "link", label: "🔗", title: "Link" },
  { id: "hr", label: "—", title: "Linha separadora" },
];

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Falha ao salvar.");
  return data;
}

export function CadernosClient({
  mesaId,
  sheetId,
  sheetName,
  isOwner,
  initialCadernos,
}: {
  mesaId: string;
  sheetId: string;
  sheetName: string;
  isOwner: boolean;
  initialCadernos: Caderno[];
}) {
  const router = useRouter();
  const [cadernos, setCadernos] = useState<Caderno[]>(initialCadernos);
  const [cadernoId, setCadernoId] = useState<string | null>(initialCadernos[0]?.id ?? null);
  const [paginaId, setPaginaId] = useState<string | null>(initialCadernos[0]?.paginas[0]?.id ?? null);
  const [modo, setModo] = useState<Modo>(isOwner ? "editar" : "ler");
  const [status, setStatus] = useState<Status>("salvo");
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Excluindo | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  // Salvamento com debounce: guarda o último patch pendente de cada página/caderno e
  // manda depois de SAVE_DELAY sem digitar. flushAll() manda tudo na hora (troca de página, sair).
  const pendentes = useRef(new Map<string, { url: string; body: Record<string, unknown> }>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushAll = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const itens = [...pendentes.current.values()];
    pendentes.current.clear();
    if (itens.length === 0) return;
    setStatus("salvando");
    try {
      await Promise.all(itens.map((it) => api(it.url, "PATCH", it.body)));
      setStatus("salvo");
    } catch (e) {
      setStatus("erro");
      setErro((e as Error).message);
    }
  }, []);

  function agendar(chave: string, url: string, patch: Record<string, unknown>) {
    const atual = pendentes.current.get(chave);
    pendentes.current.set(chave, { url, body: { ...(atual?.body || {}), ...patch } });
    setStatus("salvando");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flushAll, SAVE_DELAY);
  }

  // Não perde o que foi digitado ao fechar/sair da aba.
  useEffect(() => {
    const onUnload = () => {
      for (const it of pendentes.current.values()) {
        fetch(it.url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(it.body),
          keepalive: true,
        });
      }
      pendentes.current.clear();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      onUnload();
    };
  }, []);

  const caderno = cadernos.find((c) => c.id === cadernoId) || null;
  const pagina = caderno?.paginas.find((p) => p.id === paginaId) || null;

  function atualizarCaderno(id: string, patch: Partial<Caderno>) {
    setCadernos((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function atualizarPagina(id: string, patch: Partial<Pagina>) {
    setCadernos((prev) =>
      prev.map((c) => ({ ...c, paginas: c.paginas.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
    );
  }

  function selecionar(cId: string, pId?: string) {
    flushAll();
    const c = cadernos.find((x) => x.id === cId);
    setCadernoId(cId);
    setPaginaId(pId ?? c?.paginas[0]?.id ?? null);
  }

  async function novoCaderno() {
    try {
      await flushAll();
      const c: Caderno = await api(`/api/sheets/${sheetId}/cadernos`, "POST", { titulo: "Novo caderno" });
      setCadernos((prev) => [...prev, c]);
      setCadernoId(c.id);
      setPaginaId(c.paginas[0]?.id ?? null);
      setModo("editar");
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function novaPagina() {
    if (!caderno) return;
    try {
      await flushAll();
      const p: Pagina = await api(`/api/cadernos/${caderno.id}/paginas`, "POST", {});
      atualizarCaderno(caderno.id, { paginas: [...caderno.paginas, p] });
      setPaginaId(p.id);
      setModo("editar");
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    const alvo = excluindo;
    setExcluindo(null);
    try {
      pendentes.current.delete(alvo.id);
      if (alvo.tipo === "caderno") {
        cadernos.find((c) => c.id === alvo.id)?.paginas.forEach((p) => pendentes.current.delete(p.id));
        await api(`/api/cadernos/${alvo.id}`, "DELETE");
        const resto = cadernos.filter((c) => c.id !== alvo.id);
        setCadernos(resto);
        setCadernoId(resto[0]?.id ?? null);
        setPaginaId(resto[0]?.paginas[0]?.id ?? null);
      } else if (caderno) {
        await api(`/api/caderno-paginas/${alvo.id}`, "DELETE");
        const idx = caderno.paginas.findIndex((p) => p.id === alvo.id);
        const paginas = caderno.paginas.filter((p) => p.id !== alvo.id);
        atualizarCaderno(caderno.id, { paginas });
        setPaginaId(paginas[Math.max(0, idx - 1)]?.id ?? null);
      }
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  function setTituloCaderno(v: string) {
    if (!caderno) return;
    atualizarCaderno(caderno.id, { titulo: v });
    if (v.trim()) agendar(caderno.id, `/api/cadernos/${caderno.id}`, { titulo: v });
  }

  async function togglePublico() {
    if (!caderno) return;
    const publico = !caderno.publico;
    atualizarCaderno(caderno.id, { publico });
    try {
      await api(`/api/cadernos/${caderno.id}`, "PATCH", { publico });
    } catch (e) {
      atualizarCaderno(caderno.id, { publico: !publico });
      setErro((e as Error).message);
    }
  }

  function setTituloPagina(v: string) {
    if (!pagina) return;
    atualizarPagina(pagina.id, { titulo: v });
    if (v.trim()) agendar(pagina.id, `/api/caderno-paginas/${pagina.id}`, { titulo: v });
  }

  function setConteudo(v: string) {
    if (!pagina) return;
    atualizarPagina(pagina.id, { conteudo: v });
    agendar(pagina.id, `/api/caderno-paginas/${pagina.id}`, { conteudo: v });
  }

  // ---------- Ferramentas do editor ----------

  function aplicar(fn: (v: string, s: number, e: number) => { v: string; s: number; e: number }) {
    const ta = textRef.current;
    if (!ta || !pagina) return;
    const r = fn(ta.value, ta.selectionStart, ta.selectionEnd);
    setConteudo(r.v);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(r.s, r.e);
    });
  }

  function envolver(antes: string, depois: string, exemplo: string) {
    aplicar((v, s, e) => {
      const sel = v.slice(s, e) || exemplo;
      return { v: v.slice(0, s) + antes + sel + depois + v.slice(e), s: s + antes.length, e: s + antes.length + sel.length };
    });
  }

  function prefixar(prefixo: (i: number) => string, padrao: RegExp) {
    aplicar((v, s, e) => {
      const ini = v.lastIndexOf("\n", s - 1) + 1;
      const fimIdx = v.indexOf("\n", e);
      const fim = fimIdx === -1 ? v.length : fimIdx;
      const linhas = v.slice(ini, fim).split("\n");
      const todas = linhas.every((l) => padrao.test(l));
      const novas = linhas.map((l, i) => (todas ? l.replace(padrao, "") : prefixo(i) + l.replace(padrao, "")));
      const bloco = novas.join("\n");
      return { v: v.slice(0, ini) + bloco + v.slice(fim), s: ini, e: ini + bloco.length };
    });
  }

  function inserir(texto: string) {
    aplicar((v, s, e) => ({ v: v.slice(0, s) + texto + v.slice(e), s: s + texto.length, e: s + texto.length }));
  }

  function rodarFerramenta(id: FerramentaId) {
    switch (id) {
      case "h1": return prefixar(() => "# ", TITULO_RE);
      case "h2": return prefixar(() => "## ", TITULO_RE);
      case "h3": return prefixar(() => "### ", TITULO_RE);
      case "b": return envolver("**", "**", "negrito");
      case "i": return envolver("*", "*", "itálico");
      case "s": return envolver("~~", "~~", "riscado");
      case "ul": return prefixar(() => "- ", /^\s*[-*+]\s+(\[[ xX]\]\s+)?/);
      case "ol": return prefixar((i) => `${i + 1}. `, /^\s*\d+[.)]\s+/);
      case "task": return prefixar(() => "- [ ] ", /^\s*[-*+]\s+\[[ xX]\]\s+/);
      case "quote": return prefixar(() => "> ", /^>\s?/);
      case "code": return envolver("`", "`", "código");
      case "link": return envolver("[", "](https://)", "texto do link");
      case "hr": return inserir("\n---\n");
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "i")) {
      e.preventDefault();
      if (e.key === "b") envolver("**", "**", "negrito");
      else envolver("*", "*", "itálico");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      inserir("  ");
      return;
    }
    if (e.key !== "Enter" || e.shiftKey) return;
    // Enter numa lista continua a lista; Enter num item vazio encerra a lista.
    const ta = e.currentTarget;
    const v = ta.value;
    const s = ta.selectionStart;
    if (s !== ta.selectionEnd) return;
    const ini = v.lastIndexOf("\n", s - 1) + 1;
    const linha = v.slice(ini, s);
    const m = linha.match(/^(\s*)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?(.*)$/);
    if (!m) return;
    e.preventDefault();
    if (!m[4].trim()) {
      aplicar(() => ({ v: v.slice(0, ini) + v.slice(s), s: ini, e: ini }));
      return;
    }
    const num = m[2].match(/^(\d+)([.)])$/);
    const marcador = num ? `${parseInt(num[1], 10) + 1}${num[2]}` : m[2];
    inserir(`\n${m[1]}${marcador} ${m[3] ? "[ ] " : ""}`);
  }

  // ---------- Render ----------

  const podeEditar = isOwner;
  const statusLabel = status === "salvando" ? "Salvando…" : status === "erro" ? "⚠ Erro ao salvar" : "✓ Salvo";

  return (
    <div className="notes-page">
      <div className="sheet-actions">
        <button className="btn ghost" onClick={() => router.push(`/mesas/${mesaId}/sheets/${sheetId}`)}>
          ← Voltar pra ficha
        </button>
        {podeEditar && <span className={`notes-status is-${status}`}>{statusLabel}</span>}
      </div>

      <div className="frame notes-frame">
        <div className="notes-head">
          <h1>📓 Anotações</h1>
          <div className="notes-sub">{sheetName}</div>
        </div>

        {erro && (
          <div className="notes-erro" role="alert">
            {erro}
            <button type="button" className="icon-btn" title="Fechar" onClick={() => setErro(null)}>
              ×
            </button>
          </div>
        )}

        <div className="notes-shell">
          <aside className="notes-side">
            {podeEditar && (
              <button type="button" className="btn small notes-new" onClick={novoCaderno}>
                + Novo caderno
              </button>
            )}
            {cadernos.length === 0 && (
              <p className="derived-note">
                {podeEditar ? "Nenhum caderno ainda. Crie o primeiro!" : "Nenhum caderno visível pra você."}
              </p>
            )}
            <ul className="notes-books">
              {cadernos.map((c) => {
                const aberto = c.id === cadernoId;
                return (
                  <li key={c.id} className={aberto ? "open" : undefined}>
                    <button type="button" className="notes-book-btn" onClick={() => selecionar(c.id)}>
                      <span className="notes-book-icon">{aberto ? "📖" : "📓"}</span>
                      <span className="notes-book-title">{c.titulo || "Sem título"}</span>
                      <span className="notes-book-lock" title={c.publico ? "Visível pra mesa" : "Privado"}>
                        {c.publico ? "🌐" : "🔒"}
                      </span>
                    </button>
                    {aberto && (
                      <ul className="notes-pages">
                        {c.paginas.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              className={`notes-page-btn${p.id === paginaId ? " active" : ""}`}
                              onClick={() => selecionar(c.id, p.id)}
                            >
                              {p.titulo || "Sem título"}
                            </button>
                          </li>
                        ))}
                        {podeEditar && (
                          <li>
                            <button type="button" className="notes-page-btn notes-page-add" onClick={novaPagina}>
                              + Nova página
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="notes-main">
            {!caderno || !pagina ? (
              <div className="notes-empty">
                {podeEditar ? "Crie um caderno pra começar a anotar." : "Escolha um caderno."}
              </div>
            ) : (
              <>
                <div className="notes-book-bar">
                  {podeEditar ? (
                    <input
                      className="notes-book-input"
                      value={caderno.titulo}
                      maxLength={120}
                      placeholder="Nome do caderno"
                      onChange={(e) => setTituloCaderno(e.target.value)}
                    />
                  ) : (
                    <div className="notes-book-name">{caderno.titulo}</div>
                  )}
                  {podeEditar && (
                    <>
                      <button
                        type="button"
                        className="btn ghost small"
                        title={caderno.publico ? "Quem vê a ficha também lê esse caderno" : "Só você lê esse caderno"}
                        onClick={togglePublico}
                      >
                        {caderno.publico ? "🌐 Visível pra mesa" : "🔒 Privado"}
                      </button>
                      <button
                        type="button"
                        className="icon-btn is-danger"
                        title="Excluir caderno"
                        aria-label="Excluir caderno"
                        onClick={() => setExcluindo({ tipo: "caderno", id: caderno.id, titulo: caderno.titulo })}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>

                <div className="notes-page-bar">
                  {podeEditar ? (
                    <input
                      className="notes-page-input"
                      value={pagina.titulo}
                      maxLength={120}
                      placeholder="Título da página"
                      onChange={(e) => setTituloPagina(e.target.value)}
                    />
                  ) : (
                    <h2 className="notes-page-name">{pagina.titulo}</h2>
                  )}
                  {podeEditar && (
                    <>
                      <div className="notes-modes" role="tablist">
                        {(
                          [
                            ["editar", "✏️ Editar"],
                            ["dividir", "◫ Lado a lado"],
                            ["ler", "👁️ Ler"],
                          ] as const
                        ).map(([m, label]) => (
                          <button
                            key={m}
                            type="button"
                            role="tab"
                            aria-selected={modo === m}
                            className={`notes-mode-btn${modo === m ? " active" : ""}${m === "dividir" ? " only-wide" : ""}`}
                            onClick={() => setModo(m)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="icon-btn is-danger"
                        title={caderno.paginas.length <= 1 ? "O caderno precisa ter pelo menos uma página" : "Excluir página"}
                        aria-label="Excluir página"
                        disabled={caderno.paginas.length <= 1}
                        onClick={() => setExcluindo({ tipo: "pagina", id: pagina.id, titulo: pagina.titulo })}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>

                {podeEditar && modo !== "ler" && (
                  <div className="notes-toolbar">
                    {FERRAMENTAS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="notes-tool"
                        title={f.title}
                        aria-label={f.title}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => rodarFerramenta(f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className={`notes-body mode-${podeEditar ? modo : "ler"}`}>
                  {podeEditar && modo !== "ler" && (
                    <textarea
                      ref={textRef}
                      className="notes-editor"
                      value={pagina.conteudo}
                      spellCheck
                      placeholder={"# Título\n\nEscreva aqui... **negrito**, *itálico*, - listas, - [ ] tarefas"}
                      onChange={(e) => setConteudo(e.target.value)}
                      onKeyDown={onKeyDown}
                    />
                  )}
                  {(!podeEditar || modo !== "editar") && (
                    <div className="notes-preview md">
                      <Markdown
                        text={pagina.conteudo}
                        onToggleTask={podeEditar ? (line) => setConteudo(toggleTaskLine(pagina.conteudo, line)) : undefined}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {excluindo && (
        <ConfirmDialog
          title={excluindo.tipo === "caderno" ? "Excluir caderno" : "Excluir página"}
          message={
            excluindo.tipo === "caderno"
              ? `Excluir o caderno "${excluindo.titulo}" e todas as páginas dele? Essa ação não pode ser desfeita.`
              : `Excluir a página "${excluindo.titulo}"? Essa ação não pode ser desfeita.`
          }
          confirmLabel="Excluir"
          onConfirm={confirmarExclusao}
          onCancel={() => setExcluindo(null)}
        />
      )}
    </div>
  );
}
