// Selo curto e colorido pro "Tipo" das habilidades. O tipo continua texto livre na ficha
// ("Ação Longa (Foco)", "Ação Curta/Longa"...) — aqui ele é lido e vira selos padronizados:
// CURTA · LONGA · REAÇÃO · PASSIVA, mais FOCO como modificador. O texto original fica no title.

export type SeloKey = "curta" | "longa" | "reacao" | "passiva" | "foco";
type Selo = { key: SeloKey; label: string };

export function selosDoTipo(tipo: string): Selo[] {
  const t = (tipo || "").toLowerCase();
  const selos: Selo[] = [];
  if (t.includes("curta")) selos.push({ key: "curta", label: "Curta" });
  if (t.includes("longa")) selos.push({ key: "longa", label: "Longa" });
  if (/rea[çc][ãa]o/.test(t)) selos.push({ key: "reacao", label: "Reação" });
  // "Ação Curta (ativa passiva)" é uma ação curta, não uma Passiva.
  if (t.includes("passiva") && !t.includes("ativa passiva")) selos.push({ key: "passiva", label: "Passiva" });
  if (t.includes("foco")) selos.push({ key: "foco", label: "Foco" });
  return selos;
}

export function TipoAcaoBadge({ tipo }: { tipo: string }) {
  const selos = selosDoTipo(tipo);
  if (selos.length === 0) return <>{tipo || "—"}</>;
  const acoes = selos.filter((s) => s.key !== "foco");
  const foco = selos.find((s) => s.key === "foco");
  return (
    <span className="tipo-acao" title={tipo}>
      {acoes.map((s, i) => (
        <span key={s.key} className="tipo-acao-grupo">
          {i > 0 && <span className="tipo-acao-sep">/</span>}
          <span className={`tipo-selo tipo-${s.key}`}>{s.label}</span>
        </span>
      ))}
      {foco && <span className="tipo-selo tipo-foco">{foco.label}</span>}
    </span>
  );
}

/** Monta o texto do Tipo a partir dos selos escolhidos (inverso de selosDoTipo). */
export function tipoDosSelos(sel: Set<SeloKey>): string {
  const partes: string[] = [];
  if (sel.has("curta") && sel.has("longa")) partes.push("Ação Curta/Longa");
  else if (sel.has("curta")) partes.push("Ação Curta");
  else if (sel.has("longa")) partes.push("Ação Longa");
  if (sel.has("reacao")) partes.push("Reação");
  if (sel.has("passiva")) partes.push("Passiva");
  let texto = partes.join(" / ");
  if (sel.has("foco")) texto = texto ? `${texto} (Foco)` : "Foco";
  return texto;
}
