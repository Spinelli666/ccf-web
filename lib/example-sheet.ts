// Ported from the original Cardigan Artifact's exampleSheet() — a ready-made
// character used to show newcomers what a filled-out sheet looks like.
import { emptySheetData, type FullSheetData } from "@/lib/sheet-types";

export function exampleSheetData(): FullSheetData {
  return emptySheetData({
    name: "Harry de Hazel",
    playerName: "Exemplo",
    nivel: "4",
    biografia:
      "Jovem, cabelos cacheados castanho-avermelhados, olhos azul-acinzentados, sardas, expressão tensa de recruta ainda não acostumado ao peso da armadura e da fé que carrega.\n\nRecruta-Paladino da fé em Mitra, Harry busca equilibrar o desejo de vingança com a disciplina que sua ordem exige — um conflito interno que ainda está longe de resolver.",
    stats: {
      pvBonus: "0",
      peBonus: "0",
      armaduraNaturalBonus: "0",
      deslocamentoBonus: "0",
      inventarioBonus: "0",
      pvAtual: "105",
      peAtual: "17",
    },
    pericias: [
      { nome: "Força", valor: "5", bonus: "0" },
      { nome: "Vigor", valor: "4", bonus: "0" },
      { nome: "Evasão", valor: "3", bonus: "0" },
      { nome: "Persuasão", valor: "2", bonus: "0" },
      { nome: "Precisão", valor: "3", bonus: "0" },
      { nome: "Inteligência", valor: "1", bonus: "0" },
      { nome: "Destreza", valor: "1", bonus: "0" },
      { nome: "Furtividade", valor: "0", bonus: "0" },
      { nome: "Psionismo", valor: "0", bonus: "0" },
    ],
    racaTitulo: "Humano",
    racaHabilidades: [
      { nome: "Heroísmo", desc: "refaz um teste falho (não crítico) uma vez ao dia.", usosDiarios: 1, usosGastos: 0, temContador: false, contadorMax: "", contadorAtual: 0 },
      { nome: "Enganar a Morte", desc: "ignora uma Sentença de Morte uma vez ao dia.", usosDiarios: 1, usosGastos: 0, temContador: false, contadorMax: "", contadorAtual: 0 },
      { nome: "Incansável", desc: "Vigor Dif.15 para restaurar metade da Energia ao zerá-la, uma vez ao dia.", usosDiarios: 1, usosGastos: 0, temContador: false, contadorMax: "", contadorAtual: 0 },
    ],
    classeTitulo: "Guerreiro",
    classePH: "5",
    classeHabilidades: [
      { nome: "Ruptura", tipo: "Ação Longa", custo: "🔸🔸 · 4⚡", custoPE: "4", efeito: "Soma Força como Dano Extra. Ignora 1d12 Armadura do alvo e o danifica em -2 Durabilidade. Aplica Atordoado Inevitável.", indent: false, usosGastos: 0, temContador: false, contadorMax: "", contadorAtual: 0 },
      { nome: "Aprimoramento I", tipo: "—", custo: "1 PH", custoPE: "3", efeito: "Reduz o custo para 3⚡.", indent: true, ativo: true, usosGastos: 0, temContador: false, contadorMax: "", contadorAtual: 0 },
      { nome: "Investida", tipo: "Ação Longa", custo: "🔸🔸 · 3⚡", custoPE: "3", efeito: "Corre em linha reta atravessando/derrubando inimigos no caminho. +1 Dano Extra por metro percorrido até cada inimigo atingido.", indent: false, usosGastos: 0, temContador: false, contadorMax: "", contadorAtual: 0 },
      { nome: "Retribuição", tipo: "Ação Curta (ativa passiva)", custo: "🔸", custoPE: "", efeito: "A cada dano recebido por ele ou aliado à vista, acumula 1 ponto (máx. 6). Ao causar dano, gasta pontos: cada um vira +2 Dano Extra.", indent: false, usosGastos: 0, temContador: true, contadorMax: "6", contadorAtual: 0 },
      { nome: "Adrenalina", tipo: "Passiva", custo: "—", custoPE: "", efeito: "A cada rodada sem tomar dano, ganha +2 PVT (máx. 15). Ao derrotar um inimigo: +1 PE Temporário e +1 Ponto de Ação.", indent: false, usosGastos: 0, temContador: false, contadorMax: "", contadorAtual: 0 },
    ],
    armas: [
      { item: "🗡️ Espada", dano: "6", propriedades: "Dueler · Vorpal", preco: "20", equipado: true, durabilidadeAtual: 3, durabilidadeMax: 3 },
      { item: "🛡️ Escudo", dano: "3", propriedades: "—", preco: "40", equipado: true, durabilidadeAtual: 3, durabilidadeMax: 3 },
    ],
    armaduras: [
      { parte: "Cabeça", item: "Corifa de Malha", armadura: "2", preco: "80", equipado: true, durabilidadeAtual: 3, durabilidadeMax: 3 },
      { parte: "Torso", item: "Gibão Estofado", armadura: "3", preco: "100", equipado: true, durabilidadeAtual: 3, durabilidadeMax: 3 },
      { parte: "Torso", item: "Ombreira", armadura: "2", preco: "80", equipado: true, durabilidadeAtual: 3, durabilidadeMax: 3 },
      { parte: "Braços", item: "Manoplas", armadura: "2", preco: "80", equipado: true, durabilidadeAtual: 3, durabilidadeMax: 3 },
      { parte: "Pernas", item: "Grevas de Aço", armadura: "2", preco: "80", equipado: true, durabilidadeAtual: 3, durabilidadeMax: 3 },
      { parte: "Pés", item: "Botas Comuns", armadura: "—", preco: "10", equipado: true, durabilidadeAtual: 3, durabilidadeMax: 3 },
    ],
    remedios: [
      { item: "Tônico Milagroso (x4)", efeito: "Recupera 1d20 + 2×Vigor em PV", preco: "160", usosMax: "4", usosGastos: 0, curaDado: "20", curaMultPericia: "2", curaPericia: "Vigor" },
      { item: "Conjunto Cirúrgico (3 usos)", efeito: "Estabiliza Derrotado / remove Fratura / remove Sangramento", preco: "100", usosMax: "3", usosGastos: 0, curaDado: "", curaMultPericia: "", curaPericia: "" },
    ],
  } as Partial<FullSheetData>);
}
