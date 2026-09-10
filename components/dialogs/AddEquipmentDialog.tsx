"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { WEAPONS_LIBRARY } from "@/data/weapons";
import { ARMOR_LIBRARY } from "@/data/armor";
import type { Arma, Armadura, Remedio } from "@/lib/sheet-types";

type View =
  | "root"
  | "armas-cat"
  | "armas-list"
  | "armaduras-parts"
  | "armaduras-list"
  | "criar-tipo"
  | "criar-arma"
  | "criar-armadura"
  | "criar-generico";

type WeaponPick = Omit<Arma, "durabilidadeAtual" | "durabilidadeMax">;
type ArmorPick = Omit<Armadura, "durabilidadeAtual" | "durabilidadeMax">;
type RemedioPick = Remedio;

const PESO_OPCOES = [
  { value: "leve", label: "Leve" },
  { value: "medio", label: "Médio" },
  { value: "pesado", label: "Pesado" },
  { value: "mpesado", label: "M. Pesado" },
];

export function AddEquipmentDialog({
  onAdd,
  onCancel,
}: {
  onAdd: (payload: { armas: WeaponPick[]; armaduras: ArmorPick[]; remedios: RemedioPick[] }) => void;
  onCancel: () => void;
}) {
  const [view, setView] = useState<View>("root");
  const [armaCategoria, setArmaCategoria] = useState<string | null>(null);
  const [armaduraParte, setArmaduraParte] = useState<string | null>(null);
  const [selArmas, setSelArmas] = useState<Set<number>>(new Set());
  const [selArmaduras, setSelArmaduras] = useState<Set<number>>(new Set());

  const [novaArma, setNovaArma] = useState({ item: "", dano: "", propriedades: "", preco: "", peso: "medio" });
  const [novaArmadura, setNovaArmadura] = useState({ item: "", parte: "", armadura: "", preco: "", peso: "medio" });
  const [novoGenerico, setNovoGenerico] = useState({ item: "", efeito: "", preco: "", peso: "leve", quantidade: "1" });

  const partesArmadura = useMemo(() => Array.from(new Set(ARMOR_LIBRARY.map((a) => a.parte))), []);
  const total = selArmas.size + selArmaduras.size;

  function toggleArma(i: number) {
    setSelArmas((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }
  function toggleArmadura(i: number) {
    setSelArmaduras((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleAdd() {
    onAdd({
      armas: Array.from(selArmas).map((i) => ({ ...WEAPONS_LIBRARY[i], equipado: false })),
      armaduras: Array.from(selArmaduras).map((i) => ({ ...ARMOR_LIBRARY[i], equipado: false })),
      remedios: [],
    });
  }

  function handleCriarArma() {
    if (!novaArma.item.trim()) return;
    onAdd({
      armas: [{ ...novaArma, item: novaArma.item.trim(), equipado: false }],
      armaduras: [],
      remedios: [],
    });
  }

  function handleCriarArmadura() {
    if (!novaArmadura.item.trim()) return;
    onAdd({
      armas: [],
      armaduras: [{ ...novaArmadura, item: novaArmadura.item.trim(), equipado: false }],
      remedios: [],
    });
  }

  function handleCriarGenerico() {
    if (!novoGenerico.item.trim()) return;
    onAdd({
      armas: [],
      armaduras: [],
      remedios: [
        {
          item: novoGenerico.item.trim(),
          efeito: novoGenerico.efeito.trim(),
          preco: novoGenerico.preco,
          peso: novoGenerico.peso,
          usosMax: "0",
          usosGastos: 0,
          curaDado: "",
          curaMultPericia: "",
          curaPericia: "",
          quantidade: String(Math.max(1, parseInt(novoGenerico.quantidade, 10) || 1)),
        },
      ],
    });
  }

  return (
    <Modal onClose={onCancel} wide>
      {view === "root" && (
        <>
          <div className="modal-title">Adicionar Equipamento</div>
          <div className="modal-message">Escolha o tipo de equipamento pra ver os itens disponíveis, ou crie um item novo:</div>
          <div className="wizard-class-buttons" style={{ justifyContent: "center" }}>
            <button type="button" className="wizard-class-btn" onClick={() => setView("armas-cat")}>
              🗡️ Armas
            </button>
            <button type="button" className="wizard-class-btn" onClick={() => setView("armaduras-parts")}>
              🛡️ Armaduras
            </button>
            <button type="button" className="wizard-class-btn" onClick={() => setView("criar-tipo")}>
              ✏️ Criar Item
            </button>
          </div>
          <button type="button" className="btn ghost small" style={{ marginTop: 14 }} onClick={onCancel}>
            Cancelar
          </button>
        </>
      )}

      {view === "criar-tipo" && (
        <>
          <div className="modal-title">Criar Item — qual tipo?</div>
          <div className="wizard-class-buttons" style={{ justifyContent: "center" }}>
            <button type="button" className="wizard-class-btn" onClick={() => setView("criar-arma")}>
              🗡️ Arma
            </button>
            <button type="button" className="wizard-class-btn" onClick={() => setView("criar-armadura")}>
              🛡️ Armadura
            </button>
            <button type="button" className="wizard-class-btn" onClick={() => setView("criar-generico")}>
              📦 Item Genérico
            </button>
          </div>
          <button type="button" className="btn ghost small" style={{ marginTop: 10 }} onClick={() => setView("root")}>
            ← Voltar
          </button>
        </>
      )}

      {view === "criar-arma" && (
        <>
          <div className="modal-title">Criar Arma</div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Nome</label>
            <input
              type="text"
              value={novaArma.item}
              placeholder="Ex: Espada Enferrujada"
              autoFocus
              onChange={(e) => setNovaArma((v) => ({ ...v, item: e.target.value }))}
            />
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Dano</label>
            <input
              type="text"
              value={novaArma.dano}
              placeholder="Ex: 6"
              onChange={(e) => setNovaArma((v) => ({ ...v, dano: e.target.value }))}
            />
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Propriedades</label>
            <input
              type="text"
              value={novaArma.propriedades}
              placeholder="Ex: Certeiro · Ferir"
              onChange={(e) => setNovaArma((v) => ({ ...v, propriedades: e.target.value }))}
            />
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Peso</label>
            <select value={novaArma.peso} onChange={(e) => setNovaArma((v) => ({ ...v, peso: e.target.value }))}>
              {PESO_OPCOES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 14, textAlign: "left" }}>
            <label>Preço (opcional)</label>
            <input
              type="text"
              value={novaArma.preco}
              placeholder="Ex: 20"
              onChange={(e) => setNovaArma((v) => ({ ...v, preco: e.target.value }))}
            />
          </div>
          <div className="modal-options">
            <button type="button" className="btn" disabled={!novaArma.item.trim()} onClick={handleCriarArma}>
              ✅ Criar e Adicionar ao Inventário
            </button>
          </div>
          <button type="button" className="btn ghost small" onClick={() => setView("criar-tipo")}>
            ← Voltar
          </button>
        </>
      )}

      {view === "criar-armadura" && (
        <>
          <div className="modal-title">Criar Armadura</div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Nome</label>
            <input
              type="text"
              value={novaArmadura.item}
              placeholder="Ex: Peitoral de Couro"
              autoFocus
              onChange={(e) => setNovaArmadura((v) => ({ ...v, item: e.target.value }))}
            />
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Parte do corpo</label>
            <input
              type="text"
              value={novaArmadura.parte}
              placeholder="Ex: Peito"
              list="partes-armadura-opcoes"
              onChange={(e) => setNovaArmadura((v) => ({ ...v, parte: e.target.value }))}
            />
            <datalist id="partes-armadura-opcoes">
              {partesArmadura.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Armadura</label>
            <input
              type="text"
              value={novaArmadura.armadura}
              placeholder="Ex: 3"
              onChange={(e) => setNovaArmadura((v) => ({ ...v, armadura: e.target.value }))}
            />
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Peso</label>
            <select value={novaArmadura.peso} onChange={(e) => setNovaArmadura((v) => ({ ...v, peso: e.target.value }))}>
              {PESO_OPCOES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 14, textAlign: "left" }}>
            <label>Preço (opcional)</label>
            <input
              type="text"
              value={novaArmadura.preco}
              placeholder="Ex: 25"
              onChange={(e) => setNovaArmadura((v) => ({ ...v, preco: e.target.value }))}
            />
          </div>
          <div className="modal-options">
            <button type="button" className="btn" disabled={!novaArmadura.item.trim()} onClick={handleCriarArmadura}>
              ✅ Criar e Adicionar ao Inventário
            </button>
          </div>
          <button type="button" className="btn ghost small" onClick={() => setView("criar-tipo")}>
            ← Voltar
          </button>
        </>
      )}

      {view === "criar-generico" && (
        <>
          <div className="modal-title">Criar Item Genérico</div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Nome</label>
            <input
              type="text"
              value={novoGenerico.item}
              placeholder="Ex: Diário de Viagem"
              autoFocus
              onChange={(e) => setNovoGenerico((v) => ({ ...v, item: e.target.value }))}
            />
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Descrição</label>
            <textarea
              style={{ width: "100%", minHeight: 70 }}
              value={novoGenerico.efeito}
              placeholder="O que é / pra que serve..."
              onChange={(e) => setNovoGenerico((v) => ({ ...v, efeito: e.target.value }))}
            />
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Peso</label>
            <select value={novoGenerico.peso} onChange={(e) => setNovoGenerico((v) => ({ ...v, peso: e.target.value }))}>
              {PESO_OPCOES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 10, textAlign: "left" }}>
            <label>Preço (opcional)</label>
            <input
              type="text"
              value={novoGenerico.preco}
              placeholder="Ex: 5"
              onChange={(e) => setNovoGenerico((v) => ({ ...v, preco: e.target.value }))}
            />
          </div>
          <div className="field" style={{ marginBottom: 14, textAlign: "left" }}>
            <label>Quantidade</label>
            <input
              type="number"
              min={1}
              value={novoGenerico.quantidade}
              onChange={(e) => setNovoGenerico((v) => ({ ...v, quantidade: e.target.value }))}
            />
          </div>
          <div className="modal-options">
            <button type="button" className="btn" disabled={!novoGenerico.item.trim()} onClick={handleCriarGenerico}>
              ✅ Criar e Adicionar ao Inventário
            </button>
          </div>
          <button type="button" className="btn ghost small" onClick={() => setView("criar-tipo")}>
            ← Voltar
          </button>
        </>
      )}

      {view === "armas-cat" && (
        <>
          <div className="modal-title">Armas — qual tipo?</div>
          <div className="wizard-class-buttons" style={{ justifyContent: "center" }}>
            <button
              type="button"
              className="wizard-class-btn"
              onClick={() => {
                setArmaCategoria("marcial");
                setView("armas-list");
              }}
            >
              Arma Marcial
            </button>
            <button
              type="button"
              className="wizard-class-btn"
              onClick={() => {
                setArmaCategoria("distancia");
                setView("armas-list");
              }}
            >
              Arma à Distância
            </button>
          </div>
          <button type="button" className="btn ghost small" style={{ marginTop: 10 }} onClick={() => setView("root")}>
            ← Voltar
          </button>
        </>
      )}

      {view === "armas-list" && (
        <>
          <div className="modal-title">Armas {armaCategoria === "marcial" ? "Marciais" : "à Distância"}</div>
          <div className="wizard-ability-list eq-item-list">
            {WEAPONS_LIBRARY.map((w, i) => (w.categoria === armaCategoria ? (
              <label key={i} className="eq-item-row">
                <input type="checkbox" checked={selArmas.has(i)} onChange={() => toggleArma(i)} />
                <span className="eq-item-name">{w.item}</span>
                <span className="eq-item-meta">
                  💥{w.dano} · {w.propriedades} · {w.preco}🪙
                </span>
              </label>
            ) : null))}
          </div>
          <button
            type="button"
            className="btn ghost small"
            style={{ marginTop: 10 }}
            onClick={() => setView("armas-cat")}
          >
            ← Voltar
          </button>
        </>
      )}

      {view === "armaduras-parts" && (
        <>
          <div className="modal-title">Armaduras — qual parte?</div>
          <div className="wizard-class-buttons" style={{ justifyContent: "center" }}>
            {partesArmadura.map((p) => (
              <button
                key={p}
                type="button"
                className="wizard-class-btn"
                onClick={() => {
                  setArmaduraParte(p);
                  setView("armaduras-list");
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <button type="button" className="btn ghost small" style={{ marginTop: 10 }} onClick={() => setView("root")}>
            ← Voltar
          </button>
        </>
      )}

      {view === "armaduras-list" && (
        <>
          <div className="modal-title">Armaduras — {armaduraParte}</div>
          <div className="wizard-ability-list eq-item-list">
            {ARMOR_LIBRARY.map((a, i) => (a.parte === armaduraParte ? (
              <label key={i} className="eq-item-row">
                <input type="checkbox" checked={selArmaduras.has(i)} onChange={() => toggleArmadura(i)} />
                <span className="eq-item-name">{a.item}</span>
                <span className="eq-item-meta">
                  🛡️{a.armadura} · {a.preco}🪙
                </span>
              </label>
            ) : null))}
          </div>
          <button
            type="button"
            className="btn ghost small"
            style={{ marginTop: 10 }}
            onClick={() => setView("armaduras-parts")}
          >
            ← Voltar
          </button>
        </>
      )}

      {(view === "armas-list" || view === "armaduras-list") && (
        <div className="eq-footer">
          <span className="eq-footer-count">{total} item(ns) selecionado(s)</span>
          <div className="eq-footer-actions">
            <button type="button" className="btn ghost small" onClick={onCancel}>
              Cancelar
            </button>
            <button type="button" className="btn" disabled={total === 0} onClick={handleAdd}>
              ✅ Adicionar ao Inventário
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
