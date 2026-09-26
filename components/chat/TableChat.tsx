"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket-client";
import { parseDiceCommand, rollDiceCommand, rollCritClass, timeAgo } from "@/lib/dice";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { useIsNarrowViewport } from "@/lib/use-narrow-viewport";
import { useRollVisibility, setRollVisibility, type RollVisibility } from "@/lib/roll-visibility";
import { formatLog, type LogMeter } from "@/lib/chat-log";
import { isMaxRoll, podeUsarMaxRoll, setMaxRoll, useMaxRoll } from "@/lib/max-roll";

type Visibility = RollVisibility;

type ChatMessage = {
  id: string;
  authorId: string | null;
  authorName: string;
  characterName: string | null;
  characterAvatarUrl: string | null;
  kind: "roll" | "text" | "log";
  text: string;
  breakdown: string | null;
  total: number | null;
  critClass: string | null;
  sheetPrivate: boolean;
  visibility: Visibility;
  createdAt: string;
};

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100];

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "public", label: "🌐 Rolagem Pública" },
  { value: "private", label: "🔒 Rolagem Privada" },
  { value: "gm", label: "🎩 Rolagem pro Mestre" },
];

const VISIBILITY_LABELS: Record<Visibility, string> = {
  public: "🌐 Pública",
  private: "🔒 Privada",
  gm: "🎩 Pro Mestre",
};

const DICE_NOTATION_RE = /\d*d\d+(?:\s*[+-]\s*\d+)?/gi;

function renderFormula(text: string) {
  const parts = text.split(DICE_NOTATION_RE);
  const matches = text.match(DICE_NOTATION_RE) || [];
  const nodes: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part) nodes.push(<span key={`t${i}`}>{part}</span>);
    if (matches[i]) nodes.push(
      <span key={`d${i}`} className="chat-dice-highlight">
        {matches[i]}
      </span>
    );
  });
  return nodes;
}

// Nomes entre aspas (itens, habilidades, efeitos) viram destaque, sem as aspas.
function renderLogText(text: string) {
  return text.split(/"([^"]+)"/).map((part, i) =>
    i % 2 === 1 ? (
      <b key={i} className="chat-event-hl">
        {part}
      </b>
    ) : (
      part
    )
  );
}

function LogMeterBar({ meter }: { meter: LogMeter }) {
  const pct = meter.max > 0 ? Math.max(0, Math.min(1, meter.atual / meter.max)) : 0;
  return (
    <div className={`chat-event-meter is-${meter.label.toLowerCase()}${meter.atual <= 0 ? " is-zero" : ""}`}>
      <span className="chat-event-meter-label">{meter.label}</span>
      <span className="chat-event-meter-track">
        <span className="chat-event-meter-fill" style={{ width: `${pct * 100}%` }} />
      </span>
      <span className="chat-event-meter-val">
        {meter.atual}/{meter.max}
      </span>
    </div>
  );
}

export function TableChat({ mesaId }: { mesaId: string }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [, forceTick] = useState(0);
  const [showClear, setShowClear] = useState(false);
  const visibility = useRollVisibility();
  const maxRoll = useMaxRoll();
  const mostraMaxRoll = podeUsarMaxRoll(session?.user?.username);
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

  // Rola pro fim sempre que a lista de mensagens muda (histórico carregado, nova
  // mensagem chegou, deleção, limpar tudo) — depender do state em vez de chamar a
  // partir do handler do socket garante que já rodou depois do React commitar o DOM.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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
      const { total, text: breakdown } = rollDiceCommand(dice, isMaxRoll());
      socket.emit("chat:send", {
        kind: "roll",
        text: `🎲 ${breakdown}`,
        total,
        critClass: rollCritClass(total),
        visibility,
      });
    } else {
      socket.emit("chat:send", { kind: "text", text: raw, visibility });
    }
    setInput("");
  }

  function quickRoll(sides: number) {
    send(`/r 1d${sides}`);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") send(input);
  }

  function deleteButton(item: ChatMessage, className: string) {
    if (item.authorId !== session?.user?.id) return null;
    return (
      <button
        type="button"
        className={className}
        title="Excluir"
        aria-label="Excluir"
        onClick={() => getSocket(mesaId).emit("chat:delete", item.id)}
      >
        🗑️
      </button>
    );
  }

  function renderLog(item: ChatMessage) {
    const view = formatLog(item.text, item.characterName);
    const time = timeAgo(new Date(item.createdAt).getTime());
    if (view.banner) {
      return (
        <div key={item.id} className="chat-banner" title={time}>
          <span className="chat-banner-text">
            {view.icon} {renderLogText(view.body)}
          </span>
          {deleteButton(item, "chat-log-del")}
        </div>
      );
    }
    return (
      <div key={item.id} className={`chat-event tone-${view.tone}${item.sheetPrivate ? " is-private" : ""}`}>
        <span className="chat-event-icon" aria-hidden="true">
          {view.icon}
        </span>
        <div className="chat-event-main">
          <div className="chat-event-head">
            <span className="chat-event-who">
              {item.sheetPrivate && <span title="Ficha privada">🔒 </span>}
              {item.characterName || item.authorName}
            </span>
            <span className="chat-event-time">{time}</span>
          </div>
          <div className="chat-event-body">{renderLogText(view.body)}</div>
          {view.details.length > 0 &&
            (view.details.length > 1 ? (
              <div className="chat-event-chips">
                {view.details.map((d, i) => (
                  <span key={i} className="chat-event-chip">
                    {renderLogText(d)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="chat-event-detail">{renderLogText(view.details[0])}</div>
            ))}
          {view.meter && <LogMeterBar meter={view.meter} />}
        </div>
        {deleteButton(item, "chat-log-del")}
      </div>
    );
  }

  function renderText(item: ChatMessage) {
    const who = item.characterName || item.authorName;
    const mine = item.authorId === session?.user?.id;
    return (
      <div key={item.id} className={`chat-msg${mine ? " is-mine" : ""}${item.sheetPrivate ? " is-private" : ""}`}>
        {item.characterAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="chat-msg-avatar" src={item.characterAvatarUrl} alt="" />
        ) : (
          <span className="chat-msg-avatar chat-msg-avatar-letter">{who.charAt(0).toUpperCase()}</span>
        )}
        <div className="chat-msg-main">
          <div className="chat-msg-head">
            <span className="chat-msg-who">{who}</span>
            {item.characterName && item.characterName !== item.authorName && (
              <span className="chat-msg-player">{item.authorName}</span>
            )}
            {item.visibility !== "public" && (
              <span className={`chat-card-visibility chat-card-visibility-${item.visibility}`}>
                {VISIBILITY_LABELS[item.visibility]}
              </span>
            )}
            <span className="chat-msg-time">{timeAgo(new Date(item.createdAt).getTime())}</span>
          </div>
          <div className="chat-msg-bubble">{item.text}</div>
        </div>
        {deleteButton(item, "chat-log-del")}
      </div>
    );
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
              renderLog(item)
            ) : item.kind === "text" ? (
              renderText(item)
            ) : (
              <div key={item.id} className={`chat-card is-roll${item.sheetPrivate ? " is-private" : ""}`}>
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
                  {item.characterAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="chat-card-avatar" src={item.characterAvatarUrl} alt="" />
                  ) : (
                    <span className="chat-card-avatar chat-card-avatar-letter">
                      {(item.characterName || item.authorName).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="chat-card-who">{item.characterName || item.authorName}</span>
                  <span className="chat-card-time">{timeAgo(new Date(item.createdAt).getTime())}</span>
                </div>
                <div className={`chat-card-visibility chat-card-visibility-${item.visibility}`}>
                  {VISIBILITY_LABELS[item.visibility]}
                </div>
                <div className="chat-card-formula">{renderFormula(item.text)}</div>
                {item.total !== null && (
                  <div className="chat-card-total-box">
                    <span className={`chat-card-total ${item.critClass || ""}`}>{item.total}</span>
                  </div>
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
        <div className="chat-visibility-row">
        <select
          className="chat-visibility-select"
          value={visibility}
          title="Quem pode ver as próximas rolagens/mensagens enviadas daqui"
          onChange={(e) => setRollVisibility(e.target.value as Visibility)}
        >
          {VISIBILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {mostraMaxRoll && (
          <button
            type="button"
            className={`chat-maxroll-btn${maxRoll ? " active" : ""}`}
            title={maxRoll ? "Rolagens no máximo: ligado" : "Rolagens no máximo: desligado"}
            aria-label="Rolagens no máximo"
            aria-pressed={maxRoll}
            onClick={() => setMaxRoll(!maxRoll)}
          >
            ⭐
          </button>
        )}
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
