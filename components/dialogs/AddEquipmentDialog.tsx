"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { WEAPONS_LIBRARY } from "@/data/weapons";
import { ARMOR_LIBRARY } from "@/data/armor";

type View = "root" | "armas-cat" | "armas-list" | "armaduras-parts" | "armaduras-list";

type WeaponPick = (typeof WEAPONS_LIBRARY)[number] & { equipado: boolean };
type ArmorPick = (typeof ARMOR_LIBRARY)[number] & { equipado: boolean };

export function AddEquipmentDialog({
  onAdd,
  onCancel,
}: {
  onAdd: (payload: { armas: WeaponPick[]; armaduras: ArmorPick[] }) => void;
  onCancel: () => void;
}) {
  const [view, setView] = useState<View>("root");
  const [armaCategoria, setArmaCategoria] = useState<string | null>(null);
  const [armaduraParte, setArmaduraParte] = useState<string | null>(null);
  const [selArmas, setSelArmas] = useState<Set<number>>(new Set());
  const [selArmaduras, setSelArmaduras] = useState<Set<number>>(new Set());

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
    });
  }

  return (
    <Modal onClose={onCancel} wide>
      {view === "root" && (
        <>
          <div className="modal-title">Adicionar Equipamento</div>
          <div className="modal-message">Escolha o tipo de equipamento pra ver os itens disponíveis:</div>
          <div className="wizard-class-buttons" style={{ justifyContent: "center" }}>
            <button type="button" className="wizard-class-btn" onClick={() => setView("armas-cat")}>
              🗡️ Armas
            </button>
            <button type="button" className="wizard-class-btn" onClick={() => setView("armaduras-parts")}>
              🛡️ Armaduras
            </button>
          </div>
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
    </Modal>
  );
}
