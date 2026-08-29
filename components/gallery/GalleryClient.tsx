"use client";

import { useState } from "react";
import Link from "next/link";
import { SheetCard, type SheetSummary } from "./SheetCard";

export function GalleryClient({
  sheets: initialSheets,
  currentUserId,
}: {
  sheets: SheetSummary[];
  currentUserId: string;
}) {
  const [sheets, setSheets] = useState(initialSheets);
  const [filterMine, setFilterMine] = useState(false);

  const visible = filterMine ? sheets.filter((s) => s.ownerId === currentUserId) : sheets;

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
        <Link href="/wizard" className="btn">
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
