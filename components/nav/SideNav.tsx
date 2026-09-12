"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useIsNarrowViewport } from "@/lib/use-narrow-viewport";
import { EditarPerfilDialog } from "@/components/dialogs/EditarPerfilDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { RenomearMesaDialog } from "@/components/dialogs/RenomearMesaDialog";

export function SideNav({
  displayName,
  mesaId,
  mesaNome,
  isGM,
}: {
  displayName: string;
  mesaId: string;
  mesaNome: string;
  isGM: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // Em celular a navbar viria por cima do conteúdo empilhada — começa recolhida pra não
  // empurrar a ficha pra baixo da dobra, até o usuário decidir manualmente.
  const isNarrow = useIsNarrowViewport(880);
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);
  const collapsed = manualCollapsed ?? isNarrow;
  const [showEditarPerfil, setShowEditarPerfil] = useState(false);
  const [showSairMesa, setShowSairMesa] = useState(false);
  const [saindoMesa, setSaindoMesa] = useState(false);
  const [showRenomearMesa, setShowRenomearMesa] = useState(false);

  function toggle() {
    setManualCollapsed(!collapsed);
  }

  async function confirmarSairMesa() {
    setSaindoMesa(true);
    try {
      const res = await fetch(`/api/mesas/${mesaId}/leave`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Não foi possível sair da mesa.");
        return;
      }
      router.push("/mesas");
      router.refresh();
    } finally {
      setSaindoMesa(false);
      setShowSairMesa(false);
    }
  }

  const links = [
    { href: "/mesas", label: "← Mesas" },
    { href: `/mesas/${mesaId}/gallery`, label: "Galeria" },
    { href: `/mesas/${mesaId}/wizard`, label: "Criar Personagem" },
    { href: `/mesas/${mesaId}/rulebook`, label: "Regras" },
    { href: `/mesas/${mesaId}/history`, label: "Log da Mesa" },
  ];

  return (
    <nav className={`side-nav ${collapsed ? "collapsed" : ""}`}>
      <div className="side-nav-head">
        <div className="brand">
          Sistema Cardigan <span>· {mesaNome}</span>
          {isGM && !collapsed && (
            <button type="button" className="icon-btn" title="Renomear Mesa" onClick={() => setShowRenomearMesa(true)}>
              ✏️
            </button>
          )}
        </div>
        <button
          type="button"
          className="rail-toggle"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          onClick={toggle}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>
      <div className="side-nav-body">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`navlink ${pathname === l.href ? "active" : ""}`}>
            {l.label}
          </Link>
        ))}
      </div>
      <div className="side-nav-foot">
        <div className="user-chip" style={{ marginBottom: 10 }}>
          <span className="user-chip-avatar">{displayName.charAt(0).toUpperCase()}</span>
          {displayName}
        </div>
        <button
          type="button"
          className="btn ghost small"
          style={{ width: "100%", marginBottom: 6 }}
          onClick={() => setShowEditarPerfil(true)}
        >
          ✏️ Editar Perfil
        </button>
        {!isGM && (
          <button
            type="button"
            className="btn ghost small"
            style={{ width: "100%", marginBottom: 6 }}
            onClick={() => setShowSairMesa(true)}
          >
            🚪 Sair da Mesa
          </button>
        )}
        <button
          type="button"
          className="btn ghost small"
          style={{ width: "100%" }}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sair
        </button>
      </div>
      {showEditarPerfil && <EditarPerfilDialog onCancel={() => setShowEditarPerfil(false)} />}
      {showRenomearMesa && (
        <RenomearMesaDialog mesaId={mesaId} nomeAtual={mesaNome} onCancel={() => setShowRenomearMesa(false)} />
      )}
      {showSairMesa && (
        <ConfirmDialog
          title="Sair da Mesa"
          message={`Tem certeza que quer sair da mesa "${mesaNome}"? Você vai precisar do código e da senha do Mestre pra entrar de novo.`}
          confirmLabel={saindoMesa ? "Saindo..." : "Sair da Mesa"}
          onConfirm={confirmarSairMesa}
          onCancel={() => setShowSairMesa(false)}
        />
      )}
    </nav>
  );
}
