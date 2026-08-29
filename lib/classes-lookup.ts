// Loosely-typed accessors over the auto-extracted data/classes.ts literals,
// so components can index them by a runtime class name string.
import {
  ABILITIES_LIBRARY as RAW_ABILITIES,
  AUTO_GRANT_ABILITIES as RAW_AUTO_GRANT,
  CLASSES_ORDENADAS,
} from "@/data/classes";

export type Aprimoramento = { nome: string; efeito: string; custoPE?: number };
export type AbilityEntry = {
  nome: string;
  tipo: string;
  custo: string;
  custoPE?: number;
  efeito: string;
  aprimoramentos?: Aprimoramento[];
};

export const ABILITIES_LIBRARY = RAW_ABILITIES as unknown as Record<string, AbilityEntry[]>;
export const AUTO_GRANT_ABILITIES = RAW_AUTO_GRANT as unknown as Record<string, string[]>;
export { CLASSES_ORDENADAS };
