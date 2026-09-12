"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { exampleSheetData } from "@/lib/example-sheet";
import { SheetCard, type SheetSummary } from "./SheetCard";
import { FolderDialog } from "@/components/dialogs/FolderDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";

export type FolderSummary = {
  id: string;
  mesaId: string;
  nome: string;
  ownerId: string;
  private: boolean;
};

export function GalleryClient({
  mesaId,
  sheets: initialSheets,
  folders: initialFolders,
  currentUserId,
  isGM,
}: {
  mesaId: string;
  sheets: SheetSummary[];
  folders: FolderSummary[];
  currentUserId: string;
  isGM: boolean;
}) {
  const router = useRouter();
  const [sheets, setSheets] = useState(initialSheets);
  const [folders, setFolders] = useState(initialFolders);
  const [filterMine, setFilterMine] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [folderDialog, setFolderDialog] = useState<{ folder: FolderSummary | null } | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderSummary | null>(null);

  const visible = filterMine ? sheets.filter((s) => s.ownerId === currentUserId) : sheets;
  const unfiled = visible.filter((s) => !s.folderId);

  function toggleFolder(id: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function canManageFolder(f: FolderSummary) {
    return f.ownerId === currentUserId || isGM;
  }

  function handleMoved(sheetId: string, folderId: string | null) {
    setSheets((prev) => prev.map((s) => (s.id === sheetId ? { ...s, folderId } : s)));
  }

  async function handleDeleteFolder() {
    if (!deleteFolder) return;
    const res = await fetch(`/api/folders/${deleteFolder.id}`, { method: "DELETE" });
    if (res.ok) {
      setFolders((prev) => prev.filter((f) => f.id !== deleteFolder.id));
      setSheets((prev) => prev.map((s) => (s.folderId === deleteFolder.id ? { ...s, folderId: null } : s)));
    }
    setDeleteFolder(null);
  }

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
        <button type="button" className="btn ghost" onClick={() => setFolderDialog({ folder: null })}>
          📁 Nova Pasta
        </button>
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

      {folders.map((f) => {
        const inFolder = visible.filter((s) => s.folderId === f.id);
        const open = openFolders.has(f.id);
        return (
          <div className="folder-section" key={f.id}>
            <button type="button" className="folder-head" onClick={() => toggleFolder(f.id)}>
              <span className="folder-arrow">{open ? "▾" : "▸"}</span>
              📁 {f.private && "🔒 "}
              {f.nome}
              <span className="folder-count">({inFolder.length})</span>
            </button>
            {canManageFolder(f) && (
              <div className="folder-actions">
                <button
                  type="button"
                  className="icon-btn"
                  title="Editar pasta"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFolderDialog({ folder: f });
                  }}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Apagar pasta"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteFolder(f);
                  }}
                >
                  🗑️
                </button>
              </div>
            )}
            {open &&
              (inFolder.length === 0 ? (
                <div className="side-empty">Nenhuma ficha nessa pasta ainda.</div>
              ) : (
                <div className="grid">
                  {inFolder.map((sheet) => (
                    <SheetCard
                      key={sheet.id}
                      mesaId={mesaId}
                      sheet={sheet}
                      isMine={sheet.ownerId === currentUserId || isGM}
                      folders={folders.filter(canManageFolder)}
                      onDeleted={(id) => setSheets((prev) => prev.filter((s) => s.id !== id))}
                      onMoved={handleMoved}
                    />
                  ))}
                </div>
              ))}
          </div>
        );
      })}

      {visible.length === 0 ? (
        <div className="empty">
          <h2>Nenhuma ficha por aqui</h2>
          <p>Crie uma nova ficha pra começar.</p>
        </div>
      ) : (
        unfiled.length > 0 && (
          <div className="grid">
            {unfiled.map((sheet) => (
              <SheetCard
                key={sheet.id}
                mesaId={mesaId}
                sheet={sheet}
                isMine={sheet.ownerId === currentUserId || isGM}
                folders={folders.filter(canManageFolder)}
                onDeleted={(id) => setSheets((prev) => prev.filter((s) => s.id !== id))}
                onMoved={handleMoved}
              />
            ))}
          </div>
        )
      )}

      {folderDialog && (
        <FolderDialog
          mesaId={mesaId}
          folder={folderDialog.folder}
          onCancel={() => setFolderDialog(null)}
          onSaved={(saved) => {
            setFolders((prev) => {
              const exists = prev.some((f) => f.id === saved.id);
              return exists ? prev.map((f) => (f.id === saved.id ? saved : f)) : [...prev, saved].sort((a, b) => a.nome.localeCompare(b.nome));
            });
            setFolderDialog(null);
          }}
        />
      )}

      {deleteFolder && (
        <ConfirmDialog
          title="Apagar pasta"
          message={`Apagar a pasta "${deleteFolder.nome}"? As fichas dela voltam pra "Sem pasta" — nada é apagado.`}
          confirmLabel="Apagar"
          onConfirm={handleDeleteFolder}
          onCancel={() => setDeleteFolder(null)}
        />
      )}
    </>
  );
}
