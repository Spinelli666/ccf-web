import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

/** true quando a viewport está em/abaixo de `breakpoint`px — usado só como valor
 * inicial "razoável" pra painéis recolhíveis (sidebar, combate). No servidor sempre
 * retorna false (getServerSnapshot), então não há mismatch de hidratação. */
export function useIsNarrowViewport(breakpoint: number): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.innerWidth <= breakpoint,
    () => false
  );
}
