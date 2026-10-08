"use client";

import { Modal } from "@/components/ui/Modal";
import { extrairDadosRolados } from "@/lib/dice";

/** Conta quantas vezes cada valor saiu nas rolagens que estão no chat, separado por dado. */
export function RolagensStatsDialog({ textos, onClose }: { textos: string[]; onClose: () => void }) {
  const porDado = new Map<number, Map<number, number>>();
  textos.forEach((t) =>
    extrairDadosRolados(t).forEach(({ sides, value }) => {
      const contagem = porDado.get(sides) ?? new Map<number, number>();
      contagem.set(value, (contagem.get(value) ?? 0) + 1);
      porDado.set(sides, contagem);
    })
  );
  // d20 primeiro (é o dado do sistema), depois os outros do maior pro menor.
  const dados = [...porDado.keys()].sort((a, b) => (a === 20 ? -1 : b === 20 ? 1 : b - a));

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">📊 Valores das Rolagens</div>
      {dados.length === 0 ? (
        <div className="modal-message">Nenhuma rolagem no chat ainda.</div>
      ) : (
        <div className="roll-stats">
          {dados.map((sides) => {
            const contagem = porDado.get(sides)!;
            const linhas = [...contagem.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
            const total = linhas.reduce((s, [, n]) => s + n, 0);
            const maior = linhas[0][1];
            return (
              <div key={sides} className="roll-stats-dado">
                <div className="roll-stats-head">
                  <span>d{sides}</span>
                  <span className="roll-stats-total">
                    {total} {total === 1 ? "dado rolado" : "dados rolados"}
                  </span>
                </div>
                {linhas.map(([valor, n]) => (
                  <div key={valor} className="roll-stats-linha">
                    <span className="roll-stats-valor">{valor}:</span>
                    <span className="roll-stats-vezes">
                      Saiu {n} {n === 1 ? "vez" : "vezes"}
                    </span>
                    <span className="roll-stats-barra">
                      <span style={{ width: `${(n / maior) * 100}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      <div className="modal-options">
        <button type="button" className="btn ghost small" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
