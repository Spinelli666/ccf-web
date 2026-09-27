"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";

type MesaResumo = { id: string; nome: string };

/** Escolhe a mesa de destino e transfere a ficha pra ela. */
export function TransferirFichaDialog({
  sheetId,
  nome,
  mesaAtualId,
  onTransferred,
  onCancel,
}: {
  sheetId: string;
  nome: string;
  mesaAtualId: string;
  onTransferred: () => void;
  onCancel: () => void;
}) {
  const [mesas, setMesas] = useState<MesaResumo[] | null>(null);
  const [destino, setDestino] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/mesas")
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: MesaResumo[]) => {
        if (!vivo) return;
        const outras = lista.filter((m) => m.id !== mesaAtualId);
        setMesas(outras);
        if (outras.length > 0) setDestino(outras[0].id);
      })
      .catch(() => vivo && setMesas([]));
    return () => {
      vivo = false;
    };
  }, [mesaAtualId]);

  async function transferir() {
    if (!destino) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/sheets/${sheetId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaId: destino }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível transferir a ficha.");
        return;
      }
      onTransferred();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">Transferir ficha</div>
      <div className="modal-message">
        Mover <b>{nome}</b> pra outra mesa. Ela sai desta mesa e chega lá sem pasta; as anotações vão junto.
      </div>
      {mesas === null ? (
        <p className="modal-message">Carregando mesas...</p>
      ) : mesas.length === 0 ? (
        <p className="survival-warn">Você não participa de nenhuma outra mesa.</p>
      ) : (
        <div className="field" style={{ marginBottom: 14, textAlign: "left" }}>
          <label>Mesa de destino</label>
          <select className="card-folder-select" value={destino} onChange={(e) => setDestino(e.target.value)}>
            {mesas.map((m) => (
              <option key={m.id} value={m.id}>
                🎲 {m.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      {erro && <p className="survival-warn">{erro}</p>}
      <div className="modal-options">
        <button type="button" className="btn" disabled={!destino || enviando} onClick={transferir}>
          {enviando ? "Transferindo..." : "🚚 Transferir"}
        </button>
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
