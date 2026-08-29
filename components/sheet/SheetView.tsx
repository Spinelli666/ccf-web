"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import { getSocket } from "@/lib/socket-client";
import { RichText } from "@/components/RichText";
import { StatsPanel } from "@/components/sheet/StatsPanel";
import { PericiasPanel } from "@/components/sheet/PericiasPanel";
import { AbilitiesPanel } from "@/components/sheet/AbilitiesPanel";
import { EquipmentPanel } from "@/components/sheet/EquipmentPanel";
import { EffectsPanel } from "@/components/sheet/EffectsPanel";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import type { FullSheetData } from "@/lib/sheet-types";

const TABS = ["Perícias", "Equipamentos", "Habilidades", "Profissões", "Biografia"] as const;
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
  const [downloading, setDownloading] = useState(false);

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

  async function handleDownloadImage() {
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const el = document.getElementById("sheet-frame");
      if (!el) return;
      const canvas = await html2canvas(el, { backgroundColor: "#0d2229", scale: 2 });
      const link = document.createElement("a");
      link.download = `${(sheet.name || "ficha").replace(/[^a-z0-9]+/gi, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Não foi possível gerar a imagem.");
    } finally {
      setDownloading(false);
    }
  }

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
          <button className="btn ghost" onClick={() => router.push("/history")}>
            📜 Log da Mesa
          </button>
          <button className="btn secondary small" disabled={downloading} onClick={handleDownloadImage}>
            {downloading ? "Gerando imagem..." : "📥 Baixar como imagem"}
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

      <div className="frame" id="sheet-frame">
        <div className="corner tl" /> <div className="corner tr" /> <div className="corner bl" /> <div className="corner br" />
        <div className="sheet-head">
          <h1>{sheet.name || sheetName}</h1>
          {priv && <div className="private-tag">🔒 Ficha privada — só você vê ela em &quot;Todas as fichas&quot;</div>}
        </div>
        <div className="divider">⦿</div>

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
          {tab === "Perícias" && (
            <>
              <PericiasPanel sheet={sheet} isMine={isMine} onChange={patch} />
              <EffectsPanel sheet={sheet} isMine={isMine} onChange={patch} onLog={logToChat} />
            </>
          )}
          {tab === "Equipamentos" && <EquipmentPanel sheet={sheet} isMine={isMine} onChange={patch} onLog={logToChat} />}
          {tab === "Habilidades" && <AbilitiesPanel sheet={sheet} isMine={isMine} onChange={patch} onLog={logToChat} />}
          {tab === "Profissões" && <div className="derived-note">Em breve.</div>}
          {tab === "Biografia" && (
            <>
              <div className="section identidade-inline" style={{ marginTop: 0 }}>
                <h2>Identidade</h2>
                {isMine ? (
                  <>
                    <div className="field-row">
                      <div className="field">
                        <label>Nome do personagem</label>
                        <input
                          type="text"
                          value={sheet.name}
                          placeholder="Ex: Harry de Hazel"
                          onChange={(e) => patch({ name: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label>Jogador</label>
                        <input type="text" value={ownerName} disabled />
                      </div>
                    </div>
                    <label className="chk-inline" style={{ marginTop: 8 }}>
                      <input type="checkbox" checked={priv} onChange={togglePrivate} /> 🔒 Ficha privada (só aparece
                      pra você em &quot;Todas as fichas&quot;; outros jogadores não veem)
                    </label>
                  </>
                ) : (
                  <>
                    <div className="mini-row">
                      <span className="mini-label">Nome</span>
                      <span className="info-val">{sheet.name}</span>
                    </div>
                    <div className="mini-row">
                      <span className="mini-label">Jogador</span>
                      <span className="info-val">{ownerName || "—"}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="section">
                <h2>Biografia</h2>
                {isMine && (
                  <textarea
                    className="field"
                    style={{ width: "100%", minHeight: 90, marginBottom: 10 }}
                    value={sheet.biografia}
                    placeholder="História, aparência, personalidade..."
                    onChange={(e) => patch({ biografia: e.target.value })}
                  />
                )}
                {!isMine &&
                  (sheet.biografia ? (
                    <RichText text={sheet.biografia} />
                  ) : (
                    <div className="derived-note">Sem biografia cadastrada ainda.</div>
                  ))}
              </div>
            </>
          )}
        </div>
        <div className="footer-tag">Sistema Cardigan</div>
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
