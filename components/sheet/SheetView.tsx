"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import { getSocket } from "@/lib/socket-client";
import { rollWithMode } from "@/lib/dice";
import { StatsPanel } from "@/components/sheet/StatsPanel";
import { PericiasPanel } from "@/components/sheet/PericiasPanel";
import { AbilitiesPanel } from "@/components/sheet/AbilitiesPanel";
import { EquipmentPanel } from "@/components/sheet/EquipmentPanel";
import { EffectsPanel } from "@/components/sheet/EffectsPanel";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import type { FullSheetData } from "@/lib/sheet-types";

const TABS = ["Perícias", "Habilidades", "Equipamento", "Efeitos"] as const;
type Tab = (typeof TABS)[number];

export function SheetView({
  sheetId,
  sheetName,
  isPrivate,
  ownerName,
  initialData,
  isMine,
}: {
  sheetId: string;
  sheetName: string;
  isPrivate: boolean;
  ownerName: string;
  initialData: FullSheetData;
  isMine: boolean;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState(initialData);
  const [tab, setTab] = useState<Tab>("Perícias");
  const [showDelete, setShowDelete] = useState(false);
  const [priv, setPriv] = useState(isPrivate);

  useDebouncedSave(sheetId, sheet.name || sheetName, sheet, isMine);

  function patch(p: Partial<FullSheetData>) {
    setSheet((prev) => ({ ...prev, ...p }));
  }

  function logToChat(text: string) {
    getSocket().emit("chat:send", { kind: "log", text, characterName: sheet.name });
  }

  async function togglePrivate() {
    const next = !priv;
    setPriv(next);
    await fetch(`/api/sheets/${sheetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ private: next }),
    });
  }

  async function handleDelete() {
    await fetch(`/api/sheets/${sheetId}`, { method: "DELETE" });
    router.push("/gallery");
  }

  function rollJulgamento() {
    const result = rollWithMode(20, "normal");
    getSocket().emit("chat:send", {
      kind: "roll",
      text: "Teste de Julgamento",
      total: result.picked,
      characterName: sheet.name,
    });
  }

  const derrotado = Number(sheet.stats.pvAtual) <= 0;

  return (
    <>
      <div className="sheet-actions">
        <button className="btn ghost" onClick={() => router.push("/gallery")}>
          ← Voltar
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={() => router.push("/rulebook")}>
            📖 Regras
          </button>
          {isMine && (
            <>
              <button className="btn ghost small" onClick={togglePrivate}>
                {priv ? "🔒 Privada" : "🔓 Pública"}
              </button>
              <button className="btn danger" onClick={() => setShowDelete(true)}>
                Apagar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="frame">
        <div className="sheet-head">
          {isMine ? (
            <input
              className="field"
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontWeight: 700,
                fontSize: 40,
                textAlign: "center",
                border: "none",
                background: "transparent",
                color: "var(--ink)",
                width: "100%",
              }}
              value={sheet.name}
              placeholder="Nome do personagem"
              onChange={(e) => patch({ name: e.target.value })}
            />
          ) : (
            <h1>{sheet.name || sheetName}</h1>
          )}
          <div className="sub">Jogador: {ownerName}</div>
          {isMine ? (
            <textarea
              className="field"
              style={{ width: "100%", background: "transparent", border: "none", textAlign: "center" }}
              value={sheet.biografia}
              placeholder="Biografia..."
              onChange={(e) => patch({ biografia: e.target.value })}
            />
          ) : (
            sheet.biografia && <div className="desc">{sheet.biografia}</div>
          )}
        </div>

        {derrotado && (
          <div className="julgamento-panel">
            <div className="julgamento-title">☠️ Derrotado</div>
            <div className="julgamento-actions">
              <button type="button" className="btn small secondary" onClick={rollJulgamento}>
                🎲 Rolar Julgamento (1d20)
              </button>
            </div>
          </div>
        )}

        <div className="field-row" style={{ justifyContent: "center" }}>
          <div className="field" style={{ maxWidth: 120 }}>
            <label>Nível</label>
            <input
              type="number"
              disabled={!isMine}
              value={sheet.nivel}
              onChange={(e) => patch({ nivel: e.target.value })}
            />
          </div>
          <div className="field" style={{ maxWidth: 200 }}>
            <label>Raça</label>
            <input
              disabled={!isMine}
              value={sheet.racaTitulo}
              onChange={(e) => patch({ racaTitulo: e.target.value })}
            />
          </div>
          <div className="field" style={{ maxWidth: 200 }}>
            <label>Classe</label>
            <input
              disabled={!isMine}
              value={sheet.classeTitulo}
              onChange={(e) => patch({ classeTitulo: e.target.value })}
            />
          </div>
        </div>

        <StatsPanel sheet={sheet} isMine={isMine} onChange={patch} onLog={logToChat} />

        <div className="sheet-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`sheet-tab-btn ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="sheet-tab-content">
          {tab === "Perícias" && <PericiasPanel sheet={sheet} isMine={isMine} onChange={patch} />}
          {tab === "Habilidades" && (
            <AbilitiesPanel sheet={sheet} isMine={isMine} onChange={patch} onLog={logToChat} />
          )}
          {tab === "Equipamento" && (
            <EquipmentPanel sheet={sheet} isMine={isMine} onChange={patch} onLog={logToChat} />
          )}
          {tab === "Efeitos" && <EffectsPanel sheet={sheet} isMine={isMine} onChange={patch} />}
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Apagar ficha"
          message={`Tem certeza que quer apagar "${sheet.name || sheetName}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Apagar"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </>
  );
}
