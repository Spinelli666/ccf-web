"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, displayName }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || "Não foi possível criar a conta.");
      setLoading(false);
      return;
    }
    const signInRes = await signIn("credentials", { username, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    router.push("/gallery");
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="frame">
        <div className="sheet-head">
          <h1 style={{ fontSize: 32 }}>Sistema Cardigan</h1>
          <div className="sub">Criar conta</div>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="form-section">
          <div className="field-row">
            <div className="field">
              <label>Nome de exibição</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Usuário</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Criando..." : "Criar conta"}
            </button>
          </div>
        </form>
        <p style={{ textAlign: "center", fontSize: 13 }}>
          Já tem conta? <Link className="link" href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
