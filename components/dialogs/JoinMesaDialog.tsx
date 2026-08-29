"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";

export function JoinMesaDialog({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setError(null);
    if (!codigo.trim() || !senha) {
      setError("Preencha o código e a senha.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/mesas/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigo.trim(), senha }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error || "Não foi possível entrar na mesa.");
        return;
      }
      router.push(`/mesas/${body.id}/gallery`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">Entrar em Mesa</div>
      <div className="field" style={{ marginBottom: 12, textAlign: "left" }}>
        <label>Código da mesa</label>
        <input
          type="text"
          value={codigo}
          placeholder="Ex: AB12CD"
          autoFocus
          style={{ textTransform: "uppercase" }}
          onChange={(e) => setCodigo(e.target.value)}
        />
      </div>
      <div className="field" style={{ marginBottom: 14, textAlign: "left" }}>
        <label>Senha</label>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>
      {error && <p className="survival-warn">{error}</p>}
      <div className="modal-options">
        <button type="button" className="btn" disabled={loading} onClick={handleJoin}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
      <button type="button" className="btn ghost small" onClick={onCancel}>
        Cancelar
      </button>
    </Modal>
  );
}
