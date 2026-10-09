"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { TipoAcaoDialog } from "@/components/dialogs/TipoAcaoDialog";
import { TipoAcaoBadge } from "@/components/sheet/TipoAcaoBadge";
import { PericiaBonusEditor } from "@/components/dialogs/PericiaBonusEditor";
import { CLASSE_UNICA, classeDaHabilidade, custoComDiamante, findAbilityEntry } from "@/lib/classes-lookup";
import { getPericiaBonuses } from "@/lib/derived";
import type { HabilidadeClasse, PericiaBonusItem } from "@/lib/sheet-types";

const CATEGORIAS = [CLASSE_UNICA, "Guerreiro", "Ladino", "Andarilho", "Feiticeiro"];

// Mesmo formato das linhas de aprimoramento que o wizard/level up gravam na ficha.
function novaLinhaAprimoramento(nome: string, efeito: string, custoPE?: number): HabilidadeClasse {
  return {
    nome,
    tipo: "—",
    custo: "1 PH",
    custoPE: custoPE !== undefined ? String(custoPE) : "",
    efeito,
    indent: true,
    ativo: true,
    usosGastos: 0,
    temContador: false,
    contadorMax: "",
    contadorAtual: 0,
  };
}

export function EditHabilidadeDialog({
  habilidade,
  aprimoramentos = [],
  criando = false,
  onSave,
  onCancel,
}: {
  habilidade: HabilidadeClasse;
  /** Diálogo aberto pelo "+ Criar Habilidade" (habilidade nova, em branco). */
  criando?: boolean;
  /** Linhas de aprimoramento (indentadas) logo abaixo da habilidade base na ficha. */
  aprimoramentos?: HabilidadeClasse[];
  onSave: (patch: Partial<HabilidadeClasse>, aprimoramentos: HabilidadeClasse[]) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(habilidade.nome);
  const [tipo, setTipo] = useState(habilidade.tipo);
  const [custo, setCusto] = useState(custoComDiamante(habilidade.custo));
  const [custoPE, setCustoPE] = useState(habilidade.custoPE ?? "");
  const [efeito, setEfeito] = useState(habilidade.efeito);
  const [temContador, setTemContador] = useState(habilidade.temContador);
  const [contadorMax, setContadorMax] = useState(habilidade.contadorMax || "");
  const [escolhendoTipo, setEscolhendoTipo] = useState(false);
  const [aprims, setAprims] = useState<HabilidadeClasse[]>(aprimoramentos);
  const [classe, setClasse] = useState(classeDaHabilidade(habilidade));
  const [periciaBonuses, setPericiaBonuses] = useState<PericiaBonusItem[]>(getPericiaBonuses(habilidade));

  // Tiers do catálogo (I/II/III) pela habilidade original; os de fora do catálogo ficam no fim.
  const catalogo = findAbilityEntry(habilidade.nome)?.aprimoramentos ?? [];
  const ordem = (a: HabilidadeClasse) => {
    const k = catalogo.findIndex((ap) => ap.nome === a.nome);
    return k < 0 ? catalogo.length : k;
  };
  const faltando = catalogo.filter((ap) => !aprims.some((a) => a.nome === ap.nome));

  function updateAprim(k: number, patch: Partial<HabilidadeClasse>) {
    setAprims(aprims.map((a, j) => (j === k ? { ...a, ...patch } : a)));
  }
  function adicionarAprim(nomeAp: string) {
    const ap = catalogo.find((c) => c.nome === nomeAp);
    if (!ap) return;
    const next = [...aprims, novaLinhaAprimoramento(ap.nome, ap.efeito, ap.custoPE)];
    setAprims(next.sort((a, b) => ordem(a) - ordem(b)));
  }

  function salvar() {
    if (!nome.trim()) return;
    onSave({
      nome: nome.trim(),
      tipo,
      custo,
      custoPE: custoPE.trim(),
      efeito,
      ...(habilidade.indent ? {} : { classe }),
      periciaBonuses: periciaBonuses.filter((b) => b.pericia.trim()),
      temContador,
      contadorMax: temContador ? contadorMax : habilidade.contadorMax,
      contadorAtual: temContador ? Math.min(habilidade.contadorAtual, parseInt(contadorMax, 10) || 0) : habilidade.contadorAtual,
    }, aprims.map((a) => ({ ...a, custoPE: String(a.custoPE ?? "").trim() })));
  }

  return (
    <>
    <Modal onClose={onCancel} wide>
      <div className="modal-title">
        {criando ? "Criar Habilidade" : habilidade.indent ? "Editar Aprimoramento" : "Editar Habilidade"}
      </div>
      <div className="item-form">
        <div className="item-form-grid">
          <div className={`field ${habilidade.indent ? "span-3" : "span-2"}`}>
            <label>Nome</label>
            <input type="text" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
          </div>
          {!habilidade.indent && (
            <div className="field">
              <label>Categoria</label>
              <select value={classe} onChange={(e) => setClasse(e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label>Tipo</label>
            <button type="button" className="tipo-field" title="Escolher o tipo da ação" onClick={() => setEscolhendoTipo(true)}>
              {tipo.trim() ? <TipoAcaoBadge tipo={tipo} /> : <span className="tipo-field-vazio">Escolher tipo…</span>}
            </button>
          </div>
          <div className="field">
            <label>Custo (texto exibido)</label>
            <input type="text" value={custo} placeholder="Ex: 🔶🔶 · 3⚡" onChange={(e) => setCusto(e.target.value)} />
          </div>
          <div className="field">
            <label>PE gastos ao usar</label>
            <input type="number" min={0} value={custoPE} placeholder="0" onChange={(e) => setCustoPE(e.target.value)} />
          </div>
          {!habilidade.indent && (
            <>
              <label className="item-form-check span-2">
                <input type="checkbox" checked={temContador} onChange={(e) => setTemContador(e.target.checked)} /> Tem
                contador
              </label>
              <div className="field">
                <label>Contador máximo</label>
                <input
                  type="number"
                  min={0}
                  value={contadorMax}
                  disabled={!temContador}
                  onChange={(e) => setContadorMax(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="field span-3">
            <label>Efeito</label>
            <textarea rows={6} value={efeito} onChange={(e) => setEfeito(e.target.value)} />
          </div>
          <div className="field span-3">
            <PericiaBonusEditor value={periciaBonuses} onChange={setPericiaBonuses} />
          </div>
          {!habilidade.indent && (
            <div className="field span-3">
              <label>Aprimoramentos</label>
              <div className="edit-aprim-list">
                {aprims.length === 0 && <div className="hab-aprim-vazio">Nenhum aprimoramento aprendido.</div>}
                {aprims.map((a, k) => (
                  <div key={a.nome + k} className="edit-aprim-item">
                    <div className="edit-aprim-head">
                      <span className="hab-tier learned">{ordem(a) < catalogo.length ? ordem(a) + 1 : k + 1}</span>
                      <span className="edit-aprim-nome">{a.nome}</span>
                      <input
                        type="number"
                        min={0}
                        className="edit-aprim-pe"
                        title="PE gastos ao usar (substitui o custo da habilidade)"
                        placeholder="PE"
                        value={a.custoPE ?? ""}
                        onChange={(e) => updateAprim(k, { custoPE: e.target.value })}
                      />
                      <button
                        type="button"
                        className="icon-btn is-danger"
                        title="Remover aprimoramento"
                        aria-label={`Remover ${a.nome}`}
                        onClick={() => setAprims(aprims.filter((_, j) => j !== k))}
                      >
                        🗑️
                      </button>
                    </div>
                    <textarea rows={3} value={a.efeito} onChange={(e) => updateAprim(k, { efeito: e.target.value })} />
                  </div>
                ))}
                {faltando.length > 0 && (
                  <div className="edit-aprim-add">
                    {faltando.map((ap) => (
                      <button key={ap.nome} type="button" className="btn ghost small" onClick={() => adicionarAprim(ap.nome)}>
                        + {ap.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="item-form-footer">
          <span />
          <div className="item-form-footer-actions">
            <button type="button" className="btn ghost small" onClick={onCancel}>
              Cancelar
            </button>
            <button type="button" className="btn" disabled={!nome.trim()} onClick={salvar}>
              {criando ? "✅ Criar" : "✅ Salvar"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
    {escolhendoTipo && (
      <TipoAcaoDialog
        tipo={tipo}
        onConfirm={(t) => {
          setTipo(t);
          setEscolhendoTipo(false);
        }}
        onCancel={() => setEscolhendoTipo(false)}
      />
    )}
    </>
  );
}
