"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { exampleSheetData } from "@/lib/example-sheet";
import { SheetCard, type SheetSummary } from "./SheetCard";

export function GalleryClient({
  mesaId,
  sheets: initialSheets,
  currentUserId,
}: {
  mesaId: string;
  sheets: SheetSummary[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [sheets, setSheets] = useState(initialSheets);
  const [filterMine, setFilterMine] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);

  const visible = filterMine ? sheets.filter((s) => s.ownerId === currentUserId) : sheets;

  async function openExample() {
    const existing = sheets.find((s) => s.name === "Harry de Hazel");
    if (existing) {
      router.push(`/mesas/${mesaId}/sheets/${existing.id}`);
      return;
    }
    setLoadingExample(true);
    try {
      const example = exampleSheetData();
      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaId, name: example.name, private: false, data: example }),
      });
      const created = await res.json();
      if (created?.id) router.push(`/mesas/${mesaId}/sheets/${created.id}`);
    } finally {
      setLoadingExample(false);
    }
  }

  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          <span className={`tab ${!filterMine ? "active" : ""}`} onClick={() => setFilterMine(false)}>
            Todas as Fichas
          </span>
          <span className={`tab ${filterMine ? "active" : ""}`} onClick={() => setFilterMine(true)}>
            Minhas Fichas
          </span>
        </div>
        <div className="filler" />
        <Link href={`/mesas/${mesaId}/history`} className="btn ghost">
          📜 Log da Mesa
        </Link>
        <button type="button" className="btn ghost" disabled={loadingExample} onClick={openExample}>
          {loadingExample ? "Abrindo..." : "Ver ficha de exemplo"}
        </button>
        <Link href={`/mesas/${mesaId}/wizard`} className="btn">
          + Nova Ficha
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <h2>Nenhuma ficha por aqui</h2>
          <p>Crie uma nova ficha pra começar.</p>
        </div>
      ) : (
        <div className="grid">
          {visible.map((sheet) => (
            <SheetCard
              key={sheet.id}
              mesaId={mesaId}
              sheet={sheet}
              isMine={sheet.ownerId === currentUserId}
              onDeleted={(id) => setSheets((prev) => prev.filter((s) => s.id !== id))}
            />
          ))}
        </div>
      )}
    </>
  );
}
