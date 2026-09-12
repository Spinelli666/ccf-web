"use client";

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
}: {
  mesaId: string;
  sheet: SheetSummary;
  isMine: boolean;
  folders: FolderSummary[];
  onDeleted: (id: string) => void;
  onMoved: (sheetId: string, folderId: string | null) => void;
}) {
  const router = useRouter();
  const derived = computeDerived(sheet.data || {});
  const meta = sheet.data as { name?: string; classeTitulo?: string; racaTitulo?: string } | undefined;
  const nome = meta?.name || sheet.name;
  const classeTitulo = meta?.classeTitulo || "";
  const racaTitulo = meta?.racaTitulo || "";

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Apagar a ficha de ${nome}?`)) return;
    const res = await fetch(`/api/sheets/${sheet.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(sheet.id);
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
        <button type="button" className="card-del-btn" onClick={handleDelete} title="Apagar ficha">
          🗑️
        </button>
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
