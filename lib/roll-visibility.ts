"use client";

import { useSyncExternalStore } from "react";

/**
 * Visibilidade escolhida no seletor do chat ("Rolagem Pública/Privada/pro Mestre").
 * Fica num store de módulo (e não só no state do TableChat) pra que as rolagens feitas
 * pela ficha (ataque, perícia) respeitem a mesma escolha.
 */
export type RollVisibility = "public" | "private" | "gm";

let current: RollVisibility = "public";
const listeners = new Set<() => void>();

export function getRollVisibility(): RollVisibility {
  return current;
}

export function setRollVisibility(v: RollVisibility) {
  current = v;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRollVisibility(): RollVisibility {
  return useSyncExternalStore(subscribe, getRollVisibility, () => "public");
}
