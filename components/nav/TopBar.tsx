"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function TopBar({ displayName }: { displayName: string }) {
  return (
    <div className="topbar">
      <div className="brand">
        Sistema Cardigan <span>· Fichas</span>
      </div>
      <div className="tabs">
        <Link href="/gallery" className="tab">Galeria</Link>
        <Link href="/wizard" className="tab">Criar Personagem</Link>
        <Link href="/rulebook" className="tab">Regras</Link>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, opacity: 0.8 }}>{displayName}</span>
        <button type="button" className="btn ghost small" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sair
        </button>
      </div>
    </div>
  );
}
