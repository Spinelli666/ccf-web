export type Pericia = { nome: string; valor: string; bonus: string };

export type SheetStats = {
  pvBonus: string;
  peBonus: string;
  armaduraNaturalBonus: string;
  deslocamentoBonus: string;
  inventarioBonus: string;
  pvAtual: string;
  peAtual: string;
};

export type HabilidadeRaca = {
  nome: string;
  desc: string;
  usosDiarios: string | number;
  usosGastos: number;
  temContador: boolean;
  contadorMax: string;
  contadorAtual: number;
};

export type HabilidadeClasse = {
  nome: string;
  tipo: string;
  custo: string;
  custoPE: string;
  efeito: string;
  indent: boolean;
  ativo?: boolean;
  usosGastos: number;
  temContador: boolean;
  contadorMax: string;
  contadorAtual: number;
};

export type Arma = {
  item: string;
  dano: string;
  propriedades: string;
  preco: string;
  peso?: string;
  equipado: boolean;
  durabilidadeAtual: number;
  durabilidadeMax: number;
};

export type Armadura = {
  parte: string;
  item: string;
  armadura: string;
  preco: string;
  peso?: string;
  equipado: boolean;
  durabilidadeAtual: number;
  durabilidadeMax: number;
};

export type Remedio = {
  item: string;
  efeito: string;
  preco: string;
  peso?: string;
  usosMax: string;
  usosGastos: number;
  curaDado: string;
  curaMultPericia: string;
  curaPericia: string;
  // Só faz sentido pra Itens Genéricos (usosMax "0") — remédios com usos limitados
  // usam o contador de Usos em vez de empilhar quantidade.
  quantidade?: string;
};

export type Julgamento = { sentencas: number; dadivas: number };

export type FullSheetData = {
  name: string;
  playerName: string;
  nivel: string;
  biografia: string;
  fraturas: number;
  xp: number;
  insania: number;
  toxidade: number;
  fome: number;
  sede: number;
  morto: boolean;
  pvBonusTemp: number;
  peBonusTemp: number;
  armaduraAtual: number | null;
  armaduraBonusManual: number;
  julgamento: Julgamento;
  acaoTotal: number;
  acaoBoxes: boolean[];
  stats: SheetStats;
  pericias: Pericia[];
  racaTitulo: string;
  racaHabilidades: HabilidadeRaca[];
  classeTitulo: string;
  subclasseTitulo: string;
  classePH: string;
  classeHabilidades: HabilidadeClasse[];
  armas: Arma[];
  armaduras: Armadura[];
  remedios: Remedio[];
  efeitosAtivos: string[];
};

export function emptySheetData(overrides: Partial<FullSheetData> = {}): FullSheetData {
  return {
    name: "",
    playerName: "",
    nivel: "1",
    biografia: "",
    fraturas: 0,
    xp: 0,
    insania: 0,
    toxidade: 0,
    fome: 0,
    sede: 0,
    morto: false,
    pvBonusTemp: 0,
    peBonusTemp: 0,
    armaduraAtual: null,
    armaduraBonusManual: 0,
    julgamento: { sentencas: 0, dadivas: 0 },
    acaoTotal: 4,
    acaoBoxes: [false, false, false, false],
    stats: {
      pvBonus: "0",
      peBonus: "0",
      armaduraNaturalBonus: "0",
      deslocamentoBonus: "0",
      inventarioBonus: "0",
      pvAtual: "0",
      peAtual: "0",
    },
    pericias: [
      { nome: "Força", valor: "0", bonus: "0" },
      { nome: "Vigor", valor: "0", bonus: "0" },
      { nome: "Evasão", valor: "0", bonus: "0" },
      { nome: "Persuasão", valor: "0", bonus: "0" },
      { nome: "Precisão", valor: "0", bonus: "0" },
      { nome: "Inteligência", valor: "0", bonus: "0" },
      { nome: "Destreza", valor: "0", bonus: "0" },
      { nome: "Furtividade", valor: "0", bonus: "0" },
      { nome: "Psionismo", valor: "0", bonus: "0" },
    ],
    racaTitulo: "",
    racaHabilidades: [],
    classeTitulo: "",
    subclasseTitulo: "",
    classePH: "0",
    classeHabilidades: [],
    armas: [],
    armaduras: [],
    remedios: [],
    efeitosAtivos: [],
    ...overrides,
  };
}
