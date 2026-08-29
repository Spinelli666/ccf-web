"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";

export function CreateMesaDialog({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; codigo: string } | null>(null);

  async function handleCreate() {
    setError(null);
    if (!nome.trim()) {
      setError("Dê um nome pra mesa.");
      return;
    }
    if (senha.length < 4) {
      setError("Senha precisa ter ao menos 4 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/mesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), senha }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error || "Não foi possível criar a mesa.");
        return;
      }
      setCreated(body);
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <Modal onClose={() => router.push(`/mesas/${created.id}/gallery`)}>
        <div className="modal-title">🎉 Mesa criada!</div>
        <div className="modal-message">
          Compartilhe esse código com os jogadores, junto com a senha que você escolheu:
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, margin: "14px 0", color: "var(--maroon)" }}>
            {created.codigo}
          </div>
        </div>
        <div className="modal-options">
          <button type="button" className="btn" onClick={() => router.push(`/mesas/${created.id}/gallery`)}>
            Entrar na mesa
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">Criar Mesa</div>
      <div className="field" style={{ marginBottom: 12, textAlign: "left" }}>
        <label>Nome da mesa</label>
        <input
          type="text"
          value={nome}
          placeholder="Ex: Terças com o Bernardo"
          autoFocus
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <div className="field" style={{ marginBottom: 14, textAlign: "left" }}>
        <label>Senha (pra convidar jogadores)</label>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>
      {error && <p className="survival-warn">{error}</p>}
      <div className="modal-options">
        <button type="button" className="btn" disabled={loading} onClick={handleCreate}>
          {loading ? "Criando..." : "Criar Mesa"}
        </button>
      </div>
      <button type="button" className="btn ghost small" onClick={onCancel}>
        Cancelar
      </button>
    </Modal>
  );
}
