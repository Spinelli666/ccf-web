"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { username, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Usuário ou senha inválidos.");
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
          <div className="sub">Entrar</div>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="form-section">
          <div className="field-row">
            <div className="field">
              <label>Usuário</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>
        <p style={{ textAlign: "center", fontSize: 13 }}>
          Não tem conta? <Link className="link" href="/register">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
