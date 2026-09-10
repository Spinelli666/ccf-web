"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useIsNarrowViewport } from "@/lib/use-narrow-viewport";
import { EditarPerfilDialog } from "@/components/dialogs/EditarPerfilDialog";

export function SideNav({
  displayName,
  mesaId,
  mesaNome,
}: {
  displayName: string;
  mesaId: string;
  mesaNome: string;
}) {
  const pathname = usePathname();
  // Em celular a navbar viria por cima do conteúdo empilhada — começa recolhida pra não
  // empurrar a ficha pra baixo da dobra, até o usuário decidir manualmente.
  const isNarrow = useIsNarrowViewport(880);
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);
  const collapsed = manualCollapsed ?? isNarrow;
  const [showEditarPerfil, setShowEditarPerfil] = useState(false);

  function toggle() {
    setManualCollapsed(!collapsed);
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
    </nav>
  );
}
