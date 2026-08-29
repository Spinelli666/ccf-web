"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import { useIsNarrowViewport } from "@/lib/use-narrow-viewport";
import { computeDerived, num, clamp, type SheetData } from "@/lib/derived";
import { IniciarCombateDialog, type ParticipanteSelecionavel } from "@/components/dialogs/IniciarCombateDialog";
import { AdicionarParticipanteDialog } from "@/components/dialogs/AdicionarParticipanteDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";

type Participante = {
  id: string;
  sheetId: string | null;
  sheetOwnerId: string | null;
  nome: string;
  iniciativa: number | null;
  ordem: number;
  mostrarStatus: boolean;
};

type CombateState = {
  id: string;
  mesaId: string;
  rodada: number;
  turnoAtualIndex: number;
  participantes: Participante[];
};

type SheetLite = {
  id: string;
  name: string;
  ownerId: string;
  data: SheetData & { pvBonusTemp?: number; peBonusTemp?: number };
};

function statusFor(data: SheetLite["data"]) {
  const derived = computeDerived(data);
  const pvBonusTemp = Math.max(0, num(data.pvBonusTemp, 0));
  const peBonusTemp = Math.max(0, num(data.peBonusTemp, 0));
  const pvMaxTotal = derived.pvMax + pvBonusTemp;
  const peMaxTotal = derived.peMax + peBonusTemp;
  const stats = data.stats || {};
  const pvAtual = clamp(num(stats.pvAtual), -derived.pvMax, pvMaxTotal);
  const peAtual = clamp(num(stats.peAtual), 0, peMaxTotal);
  return { pvAtual, pvMaxTotal, peAtual, peMaxTotal };
}

export function CombateClient({
  mesaId,
  isGM,
  currentUserId,
  sheets,
}: {
  mesaId: string;
  isGM: boolean;
  currentUserId: string;
  sheets: SheetLite[];
}) {
  const [combate, setCombate] = useState<CombateState | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Em telas menores (tablet pra baixo) a coluna de combate começa recolhida — ela nem
  // sempre está em uso, e ocupar 200+px fixos de largura atrapalha a ficha ao lado.
  const isNarrow = useIsNarrowViewport(1180);
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);
  const collapsed = manualCollapsed ?? isNarrow;
  const [showIniciar, setShowIniciar] = useState(false);
  const [showAdicionar, setShowAdicionar] = useState(false);
  const [showEncerrar, setShowEncerrar] = useState(false);
  const [sheetsAtuais, setSheetsAtuais] = useState<SheetLite[]>(sheets);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/combate?mesaId=${mesaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setCombate(data);
          setLoaded(true);
        }
      });

    const socket = getSocket(mesaId);
    const onState = (state: CombateState) => setCombate(state);
    const onEnded = () => setCombate(null);
    socket.on("combat:state", onState);
    socket.on("combat:ended", onEnded);
    return () => {
      cancelled = true;
      socket.off("combat:state", onState);
      socket.off("combat:ended", onEnded);
    };
  }, [mesaId]);

  // Enquanto houver participante com status visível, atualiza PV/PE periodicamente
  // (a ficha em si é editada em outra tela, então isso aqui não chega via socket).
  useEffect(() => {
    if (!combate || !combate.participantes.some((p) => p.mostrarStatus)) return;
    const interval = setInterval(() => {
      fetch(`/api/sheets?mesaId=${mesaId}`)
        .then((r) => r.json())
        .then((data) => setSheetsAtuais(data));
    }, 15000);
    return () => clearInterval(interval);
  }, [mesaId, combate]);

  const sheetsPorId = new Map(sheetsAtuais.map((s) => [s.id, s]));
  const idsEmCombate = new Set((combate?.participantes || []).map((p) => p.sheetId).filter(Boolean));
  const sheetsDisponiveis: ParticipanteSelecionavel[] = sheetsAtuais
    .filter((s) => !idsEmCombate.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, ownerId: s.ownerId }));

  function iniciar(participantes: { sheetId: string; nome: string; mostrarStatus: boolean }[]) {
    getSocket(mesaId).emit("combat:start", { participantes });
    setShowIniciar(false);
  }

  function encerrar() {
    getSocket(mesaId).emit("combat:end");
    setShowEncerrar(false);
  }

  function adicionar(p: { sheetId: string | null; nome: string; mostrarStatus: boolean }) {
    getSocket(mesaId).emit("combat:add-participant", p);
    setShowAdicionar(false);
  }

  function remover(participanteId: string) {
    getSocket(mesaId).emit("combat:remove-participant", participanteId);
  }

  function rolarIniciativa(participanteId: string) {
    getSocket(mesaId).emit("combat:roll-iniciativa", { participanteId });
  }

  function proximoTurno() {
    getSocket(mesaId).emit("combat:next-turn");
  }

  function toggleStatus(participanteId: string, mostrarStatus: boolean) {
    getSocket(mesaId).emit("combat:toggle-status", { participanteId, mostrarStatus });
  }

  function mover(index: number, direcao: -1 | 1) {
    if (!combate) return;
    const lista = [...combate.participantes];
    const alvo = index + direcao;
    if (alvo < 0 || alvo >= lista.length) return;
    [lista[index], lista[alvo]] = [lista[alvo], lista[index]];
    getSocket(mesaId).emit(
      "combat:reorder",
      lista.map((p) => p.id)
    );
  }

  if (!loaded) return null;

  const ativo = combate ? combate.participantes[combate.turnoAtualIndex] || null : null;

  return (
    <aside className={`combat-col ${collapsed ? "collapsed" : ""}`}>
      <div className="combat-col-head">
        <div className="combat-col-title">
          ⚔️ Combate
          {combate && !collapsed && <span className="combat-col-badge">●</span>}
        </div>
        <button
          type="button"
          className="rail-toggle"
          title={collapsed ? "Expandir combate" : "Recolher combate"}
          onClick={() => setManualCollapsed(!collapsed)}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <div className="combat-col-body">
        {!combate ? (
          isGM ? (
            <>
              <p className="derived-note">Nenhum combate em andamento nessa mesa.</p>
              <button type="button" className="btn small" style={{ width: "100%" }} onClick={() => setShowIniciar(true)}>
                ⚔️ Iniciar Combate
              </button>
            </>
          ) : (
            <p className="derived-note">Nenhum combate em andamento. Espere o mestre iniciar um.</p>
          )
        ) : (
          <>
            <div className="combat-col-info">
              Rodada {combate.rodada}
              {ativo && (
                <>
                  <br />
                  Turno de <b>{ativo.nome}</b>
                </>
              )}
            </div>
            {!isGM && ativo && !!ativo.sheetOwnerId && ativo.sheetOwnerId === currentUserId && (
              <button type="button" className="btn small" style={{ width: "100%" }} onClick={proximoTurno}>
                ✅ Finalizar meu turno
              </button>
            )}

            {combate.participantes.map((p, i) => {
              const sheet = p.sheetId ? sheetsPorId.get(p.sheetId) : undefined;
              const status = p.mostrarStatus && sheet ? statusFor(sheet.data) : null;
              const podeRolar = isGM || (!!p.sheetOwnerId && p.sheetOwnerId === currentUserId);
              const ehAtiva = i === combate.turnoAtualIndex;
              return (
                <div key={p.id} className={`combat-card ${ehAtiva ? "active" : ""}`}>
                  <div className="combat-card-top">
                    {isGM && (
                      <div className="combat-reorder-mini">
                        <button type="button" disabled={i === 0} onClick={() => mover(i, -1)}>
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={i === combate.participantes.length - 1}
                          onClick={() => mover(i, 1)}
                        >
                          ▼
                        </button>
                      </div>
                    )}
                    <span className="combat-card-name">
                      {ehAtiva && "▶ "}
                      {p.nome}
                    </span>
                    {isGM && (
                      <button type="button" className="combat-row-del" title="Remover do combate" onClick={() => remover(p.id)}>
                        🗑️
                      </button>
                    )}
                  </div>
                  {status && (
                    <div className="combat-card-status">
                      <span>
                        💔 {status.pvAtual}/{status.pvMaxTotal}
                      </span>
                      <span>
                        ⚡ {status.peAtual}/{status.peMaxTotal}
                      </span>
                    </div>
                  )}
                  <div className="combat-card-bottom">
                    {p.iniciativa !== null ? (
                      <span className="combat-iniciativa-val">🎲 {p.iniciativa}</span>
                    ) : podeRolar ? (
                      <button type="button" className="btn small secondary" onClick={() => rolarIniciativa(p.id)}>
                        Rolar 1d20
                      </button>
                    ) : (
                      <span className="derived-note" style={{ margin: 0 }}>
                        aguardando
                      </span>
                    )}
                    {isGM && p.sheetId && (
                      <label className="chk-inline" title="Mostrar vida/energia na coluna">
                        <input
                          type="checkbox"
                          checked={p.mostrarStatus}
                          onChange={(e) => toggleStatus(p.id, e.target.checked)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {combate && isGM && (
        <div className="combat-col-foot">
          <button type="button" className="btn small secondary" style={{ width: "100%" }} onClick={() => setShowAdicionar(true)}>
            + Adicionar
          </button>
          <button type="button" className="btn small" style={{ width: "100%" }} onClick={proximoTurno}>
            Próximo turno →
          </button>
          <button type="button" className="btn small danger" style={{ width: "100%" }} onClick={() => setShowEncerrar(true)}>
            Encerrar Combate
          </button>
        </div>
      )}

      {showIniciar && (
        <IniciarCombateDialog
          sheets={sheetsAtuais.map((s) => ({ id: s.id, name: s.name, ownerId: s.ownerId }))}
          onCancel={() => setShowIniciar(false)}
          onStart={iniciar}
        />
      )}
      {showAdicionar && (
        <AdicionarParticipanteDialog
          sheetsDisponiveis={sheetsDisponiveis}
          onCancel={() => setShowAdicionar(false)}
          onAdd={adicionar}
        />
      )}
      {showEncerrar && (
        <ConfirmDialog
          title="Encerrar Combate"
          message="Encerrar o combate atual? A ordem de iniciativa e os participantes serão perdidos."
          confirmLabel="Encerrar"
          onConfirm={encerrar}
          onCancel={() => setShowEncerrar(false)}
        />
      )}
    </aside>
  );
}
