import type { ReactNode } from "react";
import { EFEITOS_REGRAS } from "@/data/rules-effects";
import { MECANICAS_TERMOS, PERICIAS_TERMOS } from "@/lib/rules-terms";

const TODOS_TERMOS = [...Object.keys(EFEITOS_REGRAS), ...MECANICAS_TERMOS, ...PERICIAS_TERMOS].sort(
  (a, b) => b.length - a.length
);
const TERMOS_MECANICOS = new Set<string>([...MECANICAS_TERMOS, ...PERICIAS_TERMOS]);
const TERMOS_REGEX = new RegExp(`(${TODOS_TERMOS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");

function highlight(sentence: string, keyPrefix: string): ReactNode[] {
  return sentence.split(TERMOS_REGEX).map((part, i) => {
    if (!part) return null;
    const efeito = EFEITOS_REGRAS[part];
    if (efeito) {
      return (
        <b
          key={`${keyPrefix}-${i}`}
          className="effect-term effect-term-condicao"
          tabIndex={0}
          data-tooltip-icone={efeito.icone}
          data-tooltip-nome={efeito.nome}
          data-tooltip-desc={efeito.descricao}
        >
          {part}
        </b>
      );
    }
    if (TERMOS_MECANICOS.has(part)) {
      return (
        <b key={`${keyPrefix}-${i}`} className="effect-term">
          {part}
        </b>
      );
    }
    return part;
  });
}

/** Renderiza o texto de efeito de uma habilidade como lista de tópicos, com termos das
 * regras (condições, perícias, mecânicas) em negrito — condições ganham tooltip com a
 * descrição completa, extraída de chatbot-discord-sistema-rpg/data/sistema/efeitos/efeitos.md. */
export function EffectText({ text }: { text: string }) {
  const trimmed = (text || "").trim();
  if (!trimmed) return <span className="derived-note">Sem efeito descrito.</span>;

  const sentences = trimmed
    .split(/(?<=[.!])\s+(?=[A-ZÀ-Ú0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return <p className="effect-line">{highlight(trimmed, "s0")}</p>;
  }

  return (
    <ul className="effect-bullets">
      {sentences.map((s, i) => (
        <li key={i}>{highlight(s, `s${i}`)}</li>
      ))}
    </ul>
  );
}
