"use client";

import { useEffect, useRef } from "react";

/** Persists `data` (plus the sheet's top-level name) to PUT /api/sheets/:id shortly after it stops changing. */
export function useDebouncedSave(sheetId: string, name: string, data: unknown, enabled: boolean, delay = 700) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetch(`/api/sheets/${sheetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, data }),
      }).catch(() => {});
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), name, enabled]);
}
