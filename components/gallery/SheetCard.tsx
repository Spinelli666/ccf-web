"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeDerived, type SheetData } from "@/lib/derived";
import type { FolderSummary } from "./GalleryClient";

export type SheetSummary = {
  id: string;
  name: string;
  private: boolean;
  ownerId: string;
  folderId: string | null;
  data: SheetData;
  owner: { displayName: string; username: string };
};

export function SheetCard({
  mesaId,
  sheet,
  isMine,
  folders,
  onDeleted,
  onMoved,
  onDuplicated,
  onTransfer,
}: {
  mesaId: string;
  sheet: SheetSummary;
  isMine: boolean;
  folders: FolderSummary[];
  onDeleted: (id: string) => void;
  onMoved: (sheetId: string, folderId: string | null) => void;
  onDuplicated: (copia: SheetSummary) => void;
  onTransfer: (sheet: SheetSummary, nome: string) => void;
}) {
  const router = useRouter();
  const [duplicando, setDuplicando] = useState(false);
  const derived = computeDerived(sheet.data || {});
  const meta = sheet.data as { name?: string; classeTitulo?: string; racaTitulo?: string; avatarUrl?: string } | undefined;
  const nome = meta?.name || sheet.name;
  const classeTitulo = meta?.classeTitulo || "";
  const racaTitulo = meta?.racaTitulo || "";
  const avatarUrl = meta?.avatarUrl;

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Apagar a ficha de ${nome}?`)) return;
    const res = await fetch(`/api/sheets/${sheet.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(sheet.id);
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation();
    if (duplicando) return;
    setDuplicando(true);
    try {
      const res = await fetch(`/api/sheets/${sheet.id}/duplicate`, { method: "POST" });
      if (res.ok) onDuplicated(await res.json());
    } finally {
      setDuplicando(false);
    }
  }

  async function handleMove(e: React.ChangeEvent<HTMLSelectElement>) {
    const folderId = e.target.value || null;
    onMoved(sheet.id, folderId);
    await fetch(`/api/sheets/${sheet.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
  }

  return (
    <div className="frame card" onClick={() => router.push(`/mesas/${mesaId}/sheets/${sheet.id}`)}>
      {isMine && (
        <div className="card-actions">
          <button
            type="button"
            className="card-del-btn"
            onClick={handleDuplicate}
            disabled={duplicando}
            title="Duplicar ficha"
          >
            {duplicando ? "⏳" : "📑"}
          </button>
          <button
            type="button"
            className="card-del-btn"
            onClick={(e) => {
              e.stopPropagation();
              onTransfer(sheet, nome);
            }}
            title="Transferir pra outra mesa"
          >
            🚚
          </button>
          <button type="button" className="card-del-btn" onClick={handleDelete} title="Apagar ficha">
            🗑️
          </button>
        </div>
      )}
      {avatarUrl && (
        <div className="card-avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt="" />
        </div>
      )}
      <h3>
        {sheet.private && <span className="lock-badge">🔒 </span>}
        {nome}
      </h3>
      <div className="sub">
        Nível {derived.nivel} {classeTitulo && `· ${classeTitulo}`} {racaTitulo && `· ${racaTitulo}`}
      </div>
      <div className="row">
        <span>
          PV <b>{derived.pvMax}</b>
        </span>
        <span>
          PE <b>{derived.peMax}</b>
        </span>
      </div>
      <div className="player">{sheet.owner.displayName}</div>
      {sheet.private && <div className="private-tag">Privada</div>}
      {isMine && folders.length > 0 && (
        <select
          className="card-folder-select"
          value={sheet.folderId ?? ""}
          onClick={(e) => e.stopPropagation()}
          onChange={handleMove}
        >
          <option value="">📁 Sem pasta</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              📁 {f.nome}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
