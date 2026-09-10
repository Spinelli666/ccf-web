"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { CreateMesaDialog } from "@/components/dialogs/CreateMesaDialog";
import { JoinMesaDialog } from "@/components/dialogs/JoinMesaDialog";
import { EditarPerfilDialog } from "@/components/dialogs/EditarPerfilDialog";

export type MesaSummary = { id: string; nome: string; codigo: string; ownerId: string };

export function MesasClient({ mesas, currentUserId }: { mesas: MesaSummary[]; currentUserId: string }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showEditarPerfil, setShowEditarPerfil] = useState(false);

  return (
    <>
      <div className="topbar">
        <div className="brand">
          Sistema Cardigan <span>· Mesas</span>
        </div>
        <div className="topbar-user">
          <button type="button" className="btn ghost small" onClick={() => setShowEditarPerfil(true)}>
            ✏️ Editar Perfil
          </button>
          <button type="button" className="btn ghost small" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sair
          </button>
        </div>
      </div>
      {showEditarPerfil && <EditarPerfilDialog onCancel={() => setShowEditarPerfil(false)} />}

      <div className="page-inner">
        <div className="toolbar">
          <div className="filler" />
          <button type="button" className="btn ghost" onClick={() => setShowJoin(true)}>
            Entrar em Mesa
          </button>
          <button type="button" className="btn" onClick={() => setShowCreate(true)}>
            + Criar Mesa
          </button>
        </div>

        {mesas.length === 0 ? (
          <div className="empty">
            <h2>Você ainda não tem nenhuma mesa</h2>
            <p>Crie uma mesa nova (você vira o Mestre) ou entre numa mesa existente com o código e a senha do Mestre.</p>
          </div>
        ) : (
          <div className="grid">
            {mesas.map((m) => (
              <div key={m.id} className="frame card" onClick={() => router.push(`/mesas/${m.id}/gallery`)}>
                <h3>
                  {m.ownerId === currentUserId && <span title="Você é o Mestre">🎲 </span>}
                  {m.nome}
                </h3>
                <div className="sub">Código {m.codigo}</div>
                {m.ownerId === currentUserId && <div className="private-tag">Mestre</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateMesaDialog onCancel={() => setShowCreate(false)} />}
      {showJoin && <JoinMesaDialog onCancel={() => setShowJoin(false)} />}
    </>
  );
}
