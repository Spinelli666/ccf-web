"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket-client";
import { parseDiceCommand, rollDiceCommand, rollCritClass, timeAgo } from "@/lib/dice";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";

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

export function TableChat() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [, forceTick] = useState(0);
  const [showClear, setShowClear] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMessages(data);
      });

    const socket = getSocket();
    const onNew = (msg: ChatMessage) => setMessages((prev) => [...prev.slice(-199), msg]);
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
  }, []);

  function clearAll() {
    setShowClear(false);
    getSocket().emit("chat:clear");
  }

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  function send(text: string) {
    const raw = text.trim();
    if (!raw) return;
    const socket = getSocket();
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

  return (
    <div className="sidebar-inner">
      <div className="chat-header">
        <h3 style={{ margin: 0, border: "none", padding: 0 }}>💬 Mesa</h3>
        <button
          type="button"
          className="chat-clear-btn"
          title="Limpar tudo (rolagens, ações e mensagens)"
          onClick={() => setShowClear(true)}
        >
          🗑️
        </button>
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
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 ? (
          <div className="side-empty">
            Nada por aqui ainda.
            <br />
            Role um dado ou manda uma mensagem.
          </div>
        ) : (
          messages.map((item) => (
            <div key={item.id} className={`chat-msg ${item.kind === "roll" ? "is-roll" : ""}`}>
              {item.authorId === session?.user?.id && (
                <button
                  type="button"
                  className="chat-msg-del"
                  title="Excluir"
                  onClick={() => getSocket().emit("chat:delete", item.id)}
                >
                  🗑️
                </button>
              )}
              <div className="chat-msg-who">{item.authorName}</div>
              <div className="chat-msg-text">
                {item.kind === "roll" ? "🎲 " : ""}
                {item.text}
                {item.total !== null && (
                  <>
                    {" "}
                    = <span className={`chat-roll-total ${item.critClass || ""}`}>{item.total}</span>
                  </>
                )}
              </div>
              <div className="chat-msg-time">{timeAgo(new Date(item.createdAt).getTime())}</div>
            </div>
          ))
        )}
      </div>
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
  );
}
