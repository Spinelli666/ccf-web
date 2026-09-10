"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket-client";
import { parseDiceCommand, rollDiceCommand, rollCritClass, timeAgo } from "@/lib/dice";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { useIsNarrowViewport } from "@/lib/use-narrow-viewport";

type ChatMessage = {
  id: string;
  authorId: string | null;
  authorName: string;
  characterName: string | null;
  kind: "roll" | "text" | "log";
  text: string;
  breakdown: string | null;
  total: number | null;
  critClass: string | null;
  createdAt: string;
};

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100];

export function TableChat({ mesaId }: { mesaId: string }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [, forceTick] = useState(0);
  const [showClear, setShowClear] = useState(false);
  // Em celular o painel do chat cobre a tela quase inteira (fixed, largura ~viewport) —
  // começa fechado nesse caso pra não esconder a ficha, igual a SideNav/CombateClient.
  const isNarrow = useIsNarrowViewport(880);
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? !isNarrow;
  const setOpen = (v: boolean) => setManualOpen(v);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/chat?mesaId=${mesaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMessages(data);
      });

    const socket = getSocket(mesaId);
    const onNew = (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-199), msg]);
      requestAnimationFrame(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    };
    const onDeleted = (id: string) => setMessages((prev) => prev.filter((m) => m.id !== id));
    const onCleared = () => setMessages([]);
    socket.on("chat:new", onNew);
    socket.on("chat:deleted", onDeleted);
    socket.on("chat:cleared", onCleared);

    // "tempo atrás" refresh
    const interval = setInterval(() => forceTick((t) => t + 1), 30000);

    return () => {
      cancelled = true;
      socket.off("chat:new", onNew);
      socket.off("chat:deleted", onDeleted);
      socket.off("chat:cleared", onCleared);
      clearInterval(interval);
    };
  }, [mesaId]);

  function clearAll() {
    setShowClear(false);
    getSocket(mesaId).emit("chat:clear");
  }

  function send(text: string) {
    const raw = text.trim();
    if (!raw) return;
    const socket = getSocket(mesaId);
    const dice = parseDiceCommand(raw);
    if (dice) {
      const { total, text: breakdown } = rollDiceCommand(dice);
      socket.emit("chat:send", {
        kind: "roll",
        text: breakdown,
        total,
        critClass: rollCritClass(total),
      });
    } else {
      socket.emit("chat:send", { kind: "text", text: raw });
    }
    setInput("");
  }

  function quickRoll(sides: number) {
    send(`/r 1d${sides}`);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") send(input);
  }

  if (!open) {
    return (
      <button type="button" className="chat-fab" title="Abrir chat da mesa" onClick={() => setOpen(true)}>
        💬
      </button>
    );
  }

  return (
    <aside className="chat-popover">
      <div className="chat-popover-head">
        <h3>💬 Mesa</h3>
        <div className="chat-popover-head-actions">
          <button
            type="button"
            className="chat-clear-btn"
            title="Limpar tudo (rolagens, ações e mensagens)"
            onClick={() => setShowClear(true)}
          >
            🗑️
          </button>
          <button type="button" className="rail-toggle" title="Fechar chat" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
      </div>
      {showClear && (
        <ConfirmDialog
          title="Limpar tudo"
          message="Apagar todo o histórico da mesa (rolagens, ações e mensagens) pra sempre? Essa ação não pode ser desfeita."
          confirmLabel="Limpar tudo"
          onConfirm={clearAll}
          onCancel={() => setShowClear(false)}
        />
      )}
      <div className="chat-popover-body" ref={listRef}>
        {messages.length === 0 ? (
          <div className="side-empty">
            Nada por aqui ainda.
            <br />
            Role um dado ou manda uma mensagem.
          </div>
        ) : (
          messages.map((item) =>
            item.kind === "log" ? (
              <div key={item.id} className="chat-log-line">
                <span className="chat-log-icon">📜</span>
                <span className="chat-log-text">{item.text}</span>
                <span className="chat-log-time">{timeAgo(new Date(item.createdAt).getTime())}</span>
                {item.authorId === session?.user?.id && (
                  <button
                    type="button"
                    className="chat-log-del"
                    title="Excluir"
                    onClick={() => getSocket(mesaId).emit("chat:delete", item.id)}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ) : (
              <div key={item.id} className={`chat-card ${item.kind === "roll" ? "is-roll" : ""}`}>
                {item.authorId === session?.user?.id && (
                  <button
                    type="button"
                    className="chat-card-del"
                    title="Excluir"
                    onClick={() => getSocket(mesaId).emit("chat:delete", item.id)}
                  >
                    🗑️
                  </button>
                )}
                <div className="chat-card-head">
                  <span className="chat-card-avatar">{item.authorName.charAt(0).toUpperCase()}</span>
                  <span className="chat-card-who">{item.authorName}</span>
                  <span className="chat-card-time">{timeAgo(new Date(item.createdAt).getTime())}</span>
                </div>
                {item.kind === "roll" ? (
                  <>
                    <div className="chat-card-formula">🎲 {item.text}</div>
                    {item.total !== null && (
                      <div className="chat-card-total-box">
                        <span className={`chat-card-total ${item.critClass || ""}`}>{item.total}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="chat-card-text">{item.text}</div>
                )}
              </div>
            )
          )
        )}
      </div>
      <div className="chat-popover-bottom">
        <div className="chat-dice-quick">
          {QUICK_DICE.map((sides) => (
            <button key={sides} type="button" className="dice-quick-btn" onClick={() => quickRoll(sides)}>
              d{sides}
            </button>
          ))}
        </div>
        <div className="chat-input-row">
          <input
            type="text"
            placeholder='Mensagem ou "/r 2d6+3", "/r d20"...'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="button" className="btn small" onClick={() => send(input)}>
            Enviar
          </button>
        </div>
      </div>
    </aside>
  );
}
