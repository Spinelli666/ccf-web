// Selo curto e colorido pro "Tipo" das habilidades. O tipo continua texto livre na ficha
// ("Ação Longa (Foco)", "Ação Curta/Longa"...) — aqui ele é lido e vira selos padronizados:
// CURTA · LONGA · REAÇÃO · PASSIVA, mais FOCO como modificador. O texto original fica no title.

type Selo = { key: "curta" | "longa" | "reacao" | "passiva" | "foco"; label: string };

function selosDoTipo(tipo: string): Selo[] {
  const t = (tipo || "").toLowerCase();
  const selos: Selo[] = [];
  if (t.includes("curta")) selos.push({ key: "curta", label: "Curta" });
  if (t.includes("longa")) selos.push({ key: "longa", label: "Longa" });
  if (/rea[çc][ãa]o/.test(t)) selos.push({ key: "reacao", label: "Reação" });
  // "Ação Curta (ativa passiva)" é uma ação curta — "passiva" só vale quando não há ação.
  if (t.includes("passiva") && selos.length === 0) selos.push({ key: "passiva", label: "Passiva" });
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
