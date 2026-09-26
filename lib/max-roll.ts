"use client";

import { useSyncExternalStore } from "react";

/**
 * Interruptor de "rolagem no máximo" — só aparece pra conta Spinelli (ver MAX_ROLL_USERNAME).
 * Ligado, os dados das rolagens do chat, Perícias, Ataque, Descanso e Iniciativa saem no valor
 * máximo (os bônus somam normal). O Julgamento não é afetado. Fica só em memória:
 * desliga sozinho ao recarregar a página.
 */
export const MAX_ROLL_USERNAME = "spinelli";

export function podeUsarMaxRoll(username: string | null | undefined): boolean {
  return (username || "").toLowerCase() === MAX_ROLL_USERNAME;
}

let ativo = false;
const listeners = new Set<() => void>();

export function isMaxRoll(): boolean {
  return ativo;
}

export function setMaxRoll(v: boolean) {
  ativo = v;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMaxRoll(): boolean {
  return useSyncExternalStore(subscribe, isMaxRoll, () => false);
}
