"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";

export function RenomearMesaDialog({
  mesaId,
  nomeAtual,
  onCancel,
}: {
  mesaId: string;
  nomeAtual: string;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeAtual);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/mesas/${mesaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível renomear a mesa.");
        return;
      }
      router.refresh();
      onCancel();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">Renomear Mesa</div>
      <div className="field" style={{ marginBottom: 14, textAlign: "left" }}>
        <label>Nome da Mesa</label>
        <input type="text" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
      </div>
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
