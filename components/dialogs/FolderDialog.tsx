"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { FolderSummary } from "@/components/gallery/GalleryClient";

export function FolderDialog({
  mesaId,
  folder,
  onSaved,
  onCancel,
}: {
  mesaId: string;
  folder: FolderSummary | null;
  onSaved: (folder: FolderSummary) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(folder?.nome ?? "");
  const [priv, setPriv] = useState(folder?.private ?? false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      const url = folder ? `/api/folders/${folder.id}` : `/api/mesas/${mesaId}/folders`;
      const res = await fetch(url, {
        method: folder ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), private: priv }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível salvar a pasta.");
        return;
      }
      onSaved(data);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">{folder ? "Editar Pasta" : "Nova Pasta"}</div>
      <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
        <label>Nome da Pasta</label>
        <input
          type="text"
          value={nome}
          autoFocus
          placeholder="Ex: NPCs"
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <label className="chk-inline" style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} /> 🔒 Pasta privada (só
        você e o Mestre veem)
      </label>
      {erro && <p className="survival-warn">{erro}</p>}
      <div className="modal-options">
        <button type="button" className="btn" disabled={!nome.trim() || salvando} onClick={salvar}>
          {salvando ? "Salvando..." : "✅ Salvar"}
        </button>
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
