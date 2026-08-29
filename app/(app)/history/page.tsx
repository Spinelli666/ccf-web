import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/dice";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const messages = await prisma.chatMessage.findMany({
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  return (
    <>
      <div className="sheet-actions" style={{ marginBottom: 10 }}>
        <Link href="/gallery" className="btn ghost">
          ← Voltar
        </Link>
      </div>
      <div className="frame">
        <div className="section" style={{ marginTop: 0 }}>
          <h2>📜 Mesa — Rolagens, Ações e Mensagens</h2>
        </div>
        {messages.length === 0 ? (
          <div className="empty">
            <h2>Nada por aqui ainda</h2>
            <p>Role um dado, use uma skill, sofra dano, cure ou manda uma mensagem — tudo aparece aqui pra todo mundo ver.</p>
          </div>
        ) : (
          <div className="history-list">
            {messages.map((m) => (
              <div className="history-row" key={m.id}>
                <div className="history-main">
                  <span className="history-player">{m.authorName}</span>
                  {m.characterName && <span className="history-char">{m.characterName}</span>}
                  <span className="history-breakdown">
                    {m.kind === "roll" ? "🎲 " : ""}
                    {m.breakdown || m.text}
                  </span>
                </div>
                <div className="history-side">
                  {m.total !== null && <span className="history-total">{m.total}</span>}
                  <span className="history-time">{timeAgo(new Date(m.createdAt).getTime())}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
