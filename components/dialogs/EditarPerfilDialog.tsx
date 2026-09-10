"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";

export function EditarPerfilDialog({ onCancel }: { onCancel: () => void }) {
  const { data: session, update } = useSession();
  const [displayName, setDisplayName] = useState(session?.user?.name ?? "");
  const [username, setUsername] = useState(session?.user?.username ?? "");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const usernameMudou = username.trim() !== (session?.user?.username ?? "");
  const displayNameMudou = displayName.trim() !== (session?.user?.name ?? "");
  const querTrocarSenha = novaSenha.length > 0 || confirmarSenha.length > 0;
  const precisaSenhaAtual = usernameMudou || querTrocarSenha;

  async function salvar() {
    setErro(null);
    setSucesso(null);
    if (!displayName.trim()) {
      setErro("Informe um nome de exibição.");
      return;
    }
    if (usernameMudou && username.trim().length < 3) {
      setErro("Usuário precisa ter ao menos 3 caracteres.");
      return;
    }
    if (querTrocarSenha) {
      if (novaSenha.length < 6) {
        setErro("Senha nova precisa ter ao menos 6 caracteres.");
        return;
      }
      if (novaSenha !== confirmarSenha) {
        setErro("As senhas novas não coincidem.");
        return;
      }
    }
    if (precisaSenhaAtual && !senhaAtual) {
      setErro("Informe sua senha atual pra confirmar essa troca.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: displayNameMudou ? displayName.trim() : undefined,
        username: usernameMudou ? username.trim() : undefined,
        newPassword: querTrocarSenha ? novaSenha : undefined,
        currentPassword: senhaAtual || undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setErro(data?.error || "Não foi possível salvar.");
      return;
    }
    await update({ username: data.username, name: data.displayName });
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarSenha("");
    setSucesso("Perfil atualizado!");
  }

  return (
    <Modal onClose={onCancel}>
      <div className="modal-title">Editar Perfil</div>
      <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
        <label>Nome de exibição</label>
        <input value={displayName} autoFocus onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
        <label>Usuário (login)</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: querTrocarSenha ? 10 : 4, textAlign: "left" }}>
        <label>Nova senha (opcional)</label>
        <input
          type="password"
          value={novaSenha}
          placeholder="Deixe em branco pra não trocar"
          onChange={(e) => setNovaSenha(e.target.value)}
        />
      </div>
      {querTrocarSenha && (
        <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
          <label>Confirmar nova senha</label>
          <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} />
        </div>
      )}
      {precisaSenhaAtual && (
        <div className="field" style={{ marginBottom: 14, textAlign: "left" }}>
          <label>Senha atual (obrigatório pra trocar usuário ou senha)</label>
          <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
        </div>
      )}
      {erro && <p className="survival-warn">{erro}</p>}
      {sucesso && (
        <p className="derived-note" style={{ color: "#2f6b3a" }}>
          {sucesso}
        </p>
      )}
      <div className="modal-options">
        <button type="button" className="btn" disabled={saving} onClick={salvar}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
      <button type="button" className="btn ghost small" onClick={onCancel}>
        Fechar
      </button>
    </Modal>
  );
}
