// Ported from the original Cardigan Artifact (computeDerived / getPericiaVal).
// Keep in sync with module/data/*.mjs formulas in the Foundry system if the ruleset changes.

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
};

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

export function computeDerived(s: SheetData): DerivedStats {
  const nivel = Math.max(1, num(s.nivel, 1));
  const forca = getPericiaVal(s, "Força");
  const destreza = getPericiaVal(s, "Destreza");
  const vigor = getPericiaVal(s, "Vigor");
  const fraturas = clamp(num(s.fraturas, 0), 0, 5);
  const stats = s.stats || {};
  const pvMax = Math.max(
    0,
    50 + 10 * vigor + 5 * (nivel - 1) + num(stats.pvBonus, 0) - 5 * fraturas
  );
  const peMax = 10 + 1 * vigor + 1 * (nivel - 1) + num(stats.peBonus, 0);
  const armaduraNatural = Math.floor(forca / 2) + num(stats.armaduraNaturalBonus, 0);
  const deslocamento = 5 + Math.floor(destreza / 2) + num(stats.deslocamentoBonus, 0);
  const inventario = 15 + Math.floor(forca / 2) + num(stats.inventarioBonus, 0);
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
