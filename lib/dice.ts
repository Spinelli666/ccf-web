// Ported from the original Cardigan Artifact (rollDie / rollWithMode / parseDiceCommand / rollCritClass).
import { ROLL_MODES } from "@/data/roll-modes";

export type RollModeKey = keyof typeof ROLL_MODES;

export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export type RollWithModeResult = {
  picked: number;
  rolls: number[];
  mode: (typeof ROLL_MODES)[RollModeKey];
};

export function rollWithMode(sides: number, modeKey: RollModeKey): RollWithModeResult {
  const mode = ROLL_MODES[modeKey] ?? ROLL_MODES.normal;
  const rolls: number[] = [];
  for (let i = 0; i < mode.dice; i++) rolls.push(rollDie(sides));
  const picked = mode.pick === "max" ? Math.max(...rolls) : Math.min(...rolls);
  return { picked, rolls, mode };
}

export function formatRollDice(sides: number, rollInfo: RollWithModeResult): string {
  if (rollInfo.rolls.length === 1) return `d${sides} (${rollInfo.picked})`;
  return `d${sides} [${rollInfo.rolls.join(", ")}] (${rollInfo.mode.label.toLowerCase()}, ${rollInfo.picked})`;
}

export type DiceCommand = { qty: number; sides: number; mod: number };

/** Accepts "/r 1d20+1", "/r 2d6 - 3", "/roll d20", etc. */
export function parseDiceCommand(text: string): DiceCommand | null {
  const m = text.trim().match(/^\/(?:r|roll)\s+(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/i);
  if (!m) return null;
  const qty = m[1] ? parseInt(m[1], 10) : 1;
  const sides = parseInt(m[2], 10);
  const mod = m[3] ? parseInt(m[3].replace(/\s+/g, ""), 10) : 0;
  if (qty < 1 || qty > 20 || sides < 2) return null;
  return { qty, sides, mod };
}

export function rollCritClass(total: number): "roll-crit-high" | "roll-crit-low" | "" {
  if (total >= 20) return "roll-crit-high";
  if (total <= 1) return "roll-crit-low";
  return "";
}

export function rollDiceCommand(dice: DiceCommand): { rolls: number[]; total: number; text: string } {
  const rolls = Array.from({ length: dice.qty }, () => rollDie(dice.sides));
  const total = rolls.reduce((a, b) => a + b, 0) + dice.mod;
  let text = `${dice.qty}d${dice.sides}`;
  if (dice.mod) text += (dice.mod > 0 ? "+" : "") + dice.mod;
  text += ` = [${rolls.join(", ")}]${dice.mod ? (dice.mod > 0 ? " +" : " ") + dice.mod : ""}`;
  return { rolls, total, text };
}

export function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return mins + " min atrás";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h atrás";
  const days = Math.floor(hrs / 24);
  return days + "d atrás";
}
