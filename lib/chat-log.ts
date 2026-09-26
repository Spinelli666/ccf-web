// Estrutura as mensagens de log do chat (kind "log") pra exibição: ícone, categoria (cor),
// frase principal, detalhes e a barra de PV/PE. Os logs continuam sendo texto puro no banco
// (inclusive o histórico antigo) — a estrutura é derivada aqui, na hora de renderizar.

export type LogTone =
  | "dano"
  | "cura"
  | "energia"
  | "item"
  | "habilidade"
  | "efeito"
  | "acao"
  | "turno"
  | "descanso"
  | "nivel"
  | "morte"
  | "info";

export type LogMeter = { label: "PV" | "PE"; atual: number; max: number };

export type LogView = {
  icon: string;
  tone: LogTone;
  body: string;
  details: string[];
  meter?: LogMeter;
  // Avisos da mesa (rodada/turno do combate) — viram faixa centralizada, sem cartão.
  banner?: boolean;
};

type Rule = { re: RegExp; icon: string; tone: LogTone; banner?: boolean; split?: "colon" | "list" };

const RULES: Rule[] = [
  { re: /^O Mestre alterou a iniciativa/, icon: "🎩", tone: "turno", banner: true },
  { re: /^Empate na iniciativa/, icon: "⚖️", tone: "turno", banner: true },
  { re: /^Rodada \d+ começou|^Voltou pra Rodada/, icon: "🔔", tone: "turno", banner: true },
  { re: /^Agora é o turno de|^Voltou o turno/, icon: "▶️", tone: "turno", banner: true },
  { re: /sofreu \d+ de dano/, icon: "🩸", tone: "dano" },
  { re: /^curou /, icon: "❤️‍🩹", tone: "cura" },
  { re: /^gastou .* de PE/, icon: "🪫", tone: "energia" },
  { re: /^recuperou .* de PE/, icon: "🔋", tone: "energia" },
  { re: /Descanso (Curto|Longo)/, icon: "🏕️", tone: "descanso", split: "list" },
  { re: /Teste de Julgamento/, icon: "⚖️", tone: "morte", split: "colon" },
  { re: /foi executado/, icon: "☠️", tone: "morte" },
  { re: /foi poupado/, icon: "🕊️", tone: "cura" },
  { re: /subiu para o nível|Nível ajustado/, icon: "⭐", tone: "nivel" },
  { re: /Ação (Curta|Longa)/, icon: "🔸", tone: "acao", split: "colon" },
  { re: /Pontos? de Ação/, icon: "🔸", tone: "acao" },
  { re: /^recebeu o efeito/, icon: "🌀", tone: "efeito" },
  { re: /^removeu o efeito/, icon: "✖️", tone: "efeito" },
  { re: /^equipou /, icon: "📥", tone: "item" },
  { re: /^guardou /, icon: "📤", tone: "item" },
  { re: /^adicionou ao Inventário/, icon: "🎒", tone: "item", split: "list" },
  { re: /^removeu ".*" do (Inventário|Equipamento)/, icon: "🗑️", tone: "item" },
  { re: /^usou ".*" — /, icon: "🧪", tone: "item" },
  { re: /^removeu (o aprimoramento|a habilidade)/, icon: "🗑️", tone: "habilidade" },
  { re: /^usou /, icon: "✨", tone: "habilidade" },
  { re: /^marcou ".*" como/, icon: "📘", tone: "habilidade" },
  { re: /^ajustou Fraturas/, icon: "🦴", tone: "dano" },
  { re: /^ajustou /, icon: "📊", tone: "info" },
];

const METER_RE = /\s*—\s*(PV|PE):\s*(-?\d+)\s*\/\s*(\d+)\s*$/;
// Emojis/símbolos que os textos antigos já traziam no começo (🔸, ⚠️, 🔔, ▶, ◀, ↩...).
const LEADING_SYMBOLS_RE = /^[^\p{L}\p{N}"(]+/u;

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function formatLog(text: string, characterName: string | null): LogView {
  let body = text.trim().replace(LEADING_SYMBOLS_RE, "");

  // O nome do personagem já aparece no cabeçalho do cartão.
  const nome = (characterName || "").trim();
  for (const prefixo of [nome, "Personagem"]) {
    if (prefixo && body.startsWith(prefixo + " ")) {
      body = body.slice(prefixo.length).replace(/^\s*—?\s*/, "");
      break;
    }
  }

  let meter: LogMeter | undefined;
  const m = body.match(METER_RE);
  if (m) {
    meter = { label: m[1] as "PV" | "PE", atual: Number(m[2]), max: Number(m[3]) };
    body = body.slice(0, m.index);
  }

  const rule = RULES.find((r) => r.re.test(body));
  const details: string[] = [];

  // Complementos depois de " — " (ex: absorção do Bônus de Vida, efeito do item usado).
  const dash = rule?.banner ? -1 : body.indexOf(" — ");
  if (dash >= 0) {
    details.push(capitalize(body.slice(dash + 3).trim()));
    body = body.slice(0, dash);
  }

  if (rule?.split) {
    const colon = body.indexOf(": ");
    if (colon >= 0) {
      const resto = body.slice(colon + 2).replace(/\.$/, "").trim();
      body = body.slice(0, colon);
      if (rule.split === "list") details.unshift(...resto.split(/,\s*/).filter(Boolean).map(capitalize));
      else details.unshift(capitalize(resto));
    }
  }

  body = capitalize(body.replace(/\.$/, "").trim());

  return {
    icon: rule?.icon ?? "📜",
    tone: rule?.tone ?? "info",
    body,
    details,
    meter,
    banner: rule?.banner,
  };
}
