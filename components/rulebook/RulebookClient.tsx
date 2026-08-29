"use client";

import { useMemo, useState } from "react";
import { RichText } from "@/components/RichText";
import type { RulebookEntry } from "@/lib/rulebook";

export function RulebookClient({ entries }: { entries: RulebookEntry[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const categorias = useMemo(() => ["Todos", ...Array.from(new Set(entries.map((e) => e.categoria)))], [entries]);
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (q) {
      return entries.filter(
        (e) => (e.titulo + " " + e.texto).toLowerCase().includes(q) && (category === "Todos" || e.categoria === category)
      );
    }
    if (category !== "Todos") return entries.filter((e) => e.categoria === category);
    return [];
  }, [entries, q, category]);

  return (
    <div className="frame">
      <div className="section" style={{ marginTop: 0 }}>
        <h2>📖 Manual de Regras — Sistema Cardigan</h2>
        <input
          type="text"
          className="rulebook-search"
          placeholder="Pesquisar habilidades, raças, itens, efeitos, regras..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="rulebook-cats">
          {categorias.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`cat-chip ${category === cat ? "active" : ""}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="rulebook-results">
          {results.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--ink-soft)", fontStyle: "italic" }}>
              {q || category !== "Todos" ? "Nada encontrado." : "Digite algo pra pesquisar ou escolha uma categoria."}
            </p>
          ) : (
            results.map((entry, i) => (
              <div key={i} className="rb-entry">
                <button type="button" className="rb-entry-head" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                  <span className="rb-entry-cat">{entry.categoria}</span>
                  <span className="rb-entry-title">{entry.titulo}</span>
                </button>
                <div className={`rb-entry-body ${openIdx === i ? "open" : ""}`}>
                  <RichText text={entry.texto} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
