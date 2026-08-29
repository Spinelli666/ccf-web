export type Pericia = { nome: string; valor: string };

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
  usosMax: string;
  usosGastos: number;
  curaDado: string;
  curaMultPericia: string;
  curaPericia: string;
};

export type FullSheetData = {
  name: string;
  playerName: string;
  nivel: string;
  biografia: string;
  fraturas: number;
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
      { nome: "Força", valor: "0" },
      { nome: "Vigor", valor: "0" },
      { nome: "Evasão", valor: "0" },
      { nome: "Persuasão", valor: "0" },
      { nome: "Precisão", valor: "0" },
      { nome: "Inteligência", valor: "0" },
      { nome: "Destreza", valor: "0" },
      { nome: "Furtividade", valor: "0" },
      { nome: "Psionismo", valor: "0" },
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
