// Ported from the original Cardigan Artifact (computeDerived / getPericiaVal).
// Keep in sync with module/data/*.mjs formulas in the Foundry system if the ruleset changes.

import type { Arma, Armadura, HabilidadeClasse, PericiaBonusItem } from "@/lib/sheet-types";

// Ordem de exibição fixa das Perícias — usada tanto no painel (PericiasPanel) quanto no
// PDF exportado, pra manter os dois consistentes.
export const PERICIA_ORDER = [
  "Precisão",
  "Evasão",
  "Força",
  "Destreza",
  "Vigor",
  "Furtividade",
  "Persuasão",
  "Inteligência",
  "Psionismo",
];

export function orderPericias<T extends { nome: string }>(pericias: T[]): T[] {
  const ordenadas = PERICIA_ORDER.map((nome) =>
    pericias.find((p) => p.nome.trim().toLowerCase() === nome.toLowerCase())
  ).filter((p): p is T => !!p);
  const resto = pericias.filter(
    (p) => !PERICIA_ORDER.some((nome) => nome.toLowerCase() === p.nome.trim().toLowerCase())
  );
  return [...ordenadas, ...resto];
}

export type Pericia = { nome: string; valor: string | number };

export type SheetStats = {
  pvBonus?: string | number;
  peBonus?: string | number;
  armaduraNaturalBonus?: string | number;
  deslocamentoBonus?: string | number;
  inventarioBonus?: string | number;
  pvAtual?: string | number;
  peAtual?: string | number;
};

export type SheetData = {
  nivel?: string | number;
  fraturas?: string | number;
  pericias?: Pericia[];
  stats?: SheetStats;
  classeHabilidades?: HabilidadeClasse[];
  armaduras?: Armadura[];
};

// Procura um aprimoramento (linha indentada logo após a habilidade base) na ficha —
// estar na tabela já significa aprendido. Usado pra bônus derivados automáticos que dependem de aprimoramentos
// específicos (ex: Colecionador II aumentando Espaços de Inventário).
function temAprimoramentoAtivo(lista: HabilidadeClasse[] | undefined, base: string, aprimoramento: string): boolean {
  if (!lista) return false;
  let dentroDaBase = false;
  for (const h of lista) {
    if (!h.indent) {
      dentroDaBase = h.nome === base;
      continue;
    }
    if (dentroDaBase && h.nome === aprimoramento) return true;
  }
  return false;
}

export function num(v: unknown, fallback = 0): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? fallback : n;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function getPericiaVal(s: SheetData, nome: string): number {
  const p = (s.pericias || []).find(
    (pp) => pp.nome.trim().toLowerCase() === nome.toLowerCase()
  );
  return p ? num(p.valor) : 0;
}

export type DerivedStats = {
  nivel: number;
  forca: number;
  destreza: number;
  vigor: number;
  fraturas: number;
  pvMax: number;
  peMax: number;
  armaduraNatural: number;
  deslocamento: number;
  inventario: number;
  critRange: number;
};

export function equippedArmorSum(armaduras: Armadura[]): number {
  return armaduras
    .filter((a) => a.equipado)
    .reduce((sum, a) => sum + num(a.armadura, 0), 0);
}

// Algumas armas (ex: Escudo) também protegem quando equipadas — soma à parte da
// Armadura de itens de Armadura normais.
export function equippedWeaponProtectionSum(armas: Arma[]): number {
  return armas
    .filter((a) => a.equipado)
    .reduce((sum, a) => sum + num(a.protecao, 0), 0);
}

// Mochila/Cinto com Bolsas etc. — Espaços de Inventário extra quando equipadas.
export function equippedArmorInventoryBonus(armaduras: Armadura[]): number {
  return armaduras
    .filter((a) => a.equipado)
    .reduce((sum, a) => sum + num(a.inventarioBonus, 0), 0);
}

// Ex: Botas Leves — Deslocamento extra quando equipadas. Somado dentro de computeDerived.
function equippedArmorDeslocamentoBonus(armaduras: Armadura[] | undefined): number {
  if (!armaduras) return 0;
  return armaduras.filter((a) => a.equipado).reduce((sum, a) => sum + num(a.deslocamentoBonus, 0), 0);
}

// Ex: Botas Confortáveis — PE extra quando equipadas. Somado dentro de computeDerived.
function equippedArmorPeBonus(armaduras: Armadura[] | undefined): number {
  if (!armaduras) return 0;
  return armaduras.filter((a) => a.equipado).reduce((sum, a) => sum + num(a.peBonus, 0), 0);
}

// PV máximo extra de itens de Armadura equipados. Somado dentro de computeDerived.
function equippedArmorPvBonus(armaduras: Armadura[] | undefined): number {
  if (!armaduras) return 0;
  return armaduras.filter((a) => a.equipado).reduce((sum, a) => sum + num(a.pvBonus, 0), 0);
}

// Um item de Armadura pode dar bônus em mais de uma perícia ao mesmo tempo (ex: Roupa
// Escura poderia dar +1 Furtividade e +1 Precisão). Lê o campo novo (periciaBonuses,
// array) com fallback pro campo legado singular (periciaBonusNome/periciaBonusValor) de
// fichas salvas antes dessa mudança.
export function getPericiaBonuses(
  a: Pick<Armadura, "periciaBonuses" | "periciaBonusNome" | "periciaBonusValor">
): PericiaBonusItem[] {
  if (a.periciaBonuses && a.periciaBonuses.length) return a.periciaBonuses;
  if (a.periciaBonusNome) return [{ pericia: a.periciaBonusNome, valor: a.periciaBonusValor || "0" }];
  return [];
}

// Ex: Óculos (+1 Inteligência), Amuleto Divino (+1 Psionismo) — bônus de uma perícia
// específica quando equipada. Não entra em computeDerived (só importa na hora de rolar
// aquela perícia), usado por PericiasPanel.
export function equippedArmorPericiaBonus(armaduras: Armadura[], periciaNome: string): number {
  return armaduras
    .filter((a) => a.equipado)
    .flatMap((a) => getPericiaBonuses(a))
    .filter((b) => b.pericia.trim().toLowerCase() === periciaNome.trim().toLowerCase())
    .reduce((sum, b) => sum + num(b.valor, 0), 0);
}

export function computeDerived(s: SheetData): DerivedStats {
  const nivel = Math.max(1, num(s.nivel, 1));
  const forca = getPericiaVal(s, "Força");
  const destreza = getPericiaVal(s, "Destreza");
  const vigor = getPericiaVal(s, "Vigor");
  const fraturas = clamp(num(s.fraturas, 0), 0, 5);
  const stats = s.stats || {};
  const pvMax = Math.max(
    0,
    50 + 10 * vigor + 5 * (nivel - 1) + num(stats.pvBonus, 0) + equippedArmorPvBonus(s.armaduras) - 5 * fraturas
  );
  const peMax = 10 + 1 * vigor + 1 * (nivel - 1) + num(stats.peBonus, 0) + equippedArmorPeBonus(s.armaduras);
  const armaduraNatural = Math.floor(forca / 2) + num(stats.armaduraNaturalBonus, 0);
  const deslocamento = 5 + Math.floor(destreza / 2) + num(stats.deslocamentoBonus, 0) + equippedArmorDeslocamentoBonus(s.armaduras);
  const colecionadorII = temAprimoramentoAtivo(s.classeHabilidades, "Colecionador", "Aprimoramento II");
  const inventario = 15 + Math.floor(forca / 2) + num(stats.inventarioBonus, 0) + (colecionadorII ? 10 : 0);
  const critRange = Math.max(2, 20 - Math.floor(destreza / 3));
  return {
    nivel,
    forca,
    destreza,
    vigor,
    fraturas,
    pvMax,
    peMax,
    armaduraNatural,
    deslocamento,
    inventario,
    critRange,
  };
}
