"use client";

import { useRouter } from "next/navigation";
import { computeDerived, type SheetData } from "@/lib/derived";

export type SheetSummary = {
  id: string;
  name: string;
  private: boolean;
  ownerId: string;
  data: SheetData;
  owner: { displayName: string; username: string };
};

export function SheetCard({
  sheet,
  isMine,
  onDeleted,
}: {
  sheet: SheetSummary;
  isMine: boolean;
  onDeleted: (id: string) => void;
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

  return (
    <div className="frame card" onClick={() => router.push(`/sheets/${sheet.id}`)}>
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
    </div>
  );
}
