// Auto-extracted from "sistema-cardigan-fichas - Copia.html". Do not hand-edit generated sections.

export const PROPRIEDADES_ARMAS_INFO = {
  "Certeiro": "Aumenta a chance crítica da arma em 1.",
  "Dueler": "Após uma Evasão Crítica, seu próximo ataque contra o mesmo alvo que te atacou causa Desarmado 16. Além disso, ao empatar na rolagem de dados você vence o embate ao invés de rolar novamente.",
  "Vorpal": "Pode ser empunhada com duas mãos para causar +4 de dano total.",
  "Impacto": "Acerto crítico aplica 1 Fratura 11.",
  "Ferir": "Acerto crítico aplica Sangramento 11.",
  "Perfurar": "Acerto crítico ignora 1d10 de armadura do alvo.",
  "Chicote": "Pode usar Atacar ou Agarrar com essa arma a até 5m de distância. Se tirar acerto crítico em Agarrar, pode causar Desarmado 16 no alvo.",
  "Extensão": "Possui 2m de alcance.",
  "Traspassar": "Acerto crítico aplica Enfraquecido 11.",
  "Contundente": "Acerto crítico aplica Caído 16.",
  "Recarga": "Ataques com esta arma cobram uma ação de Recarga ao disparar a última munição possível (custa 3 Pontos de Ação). O número indica quantos disparos a arma suporta antes de recarregar.",
  "Saque Rápido": "Seu primeiro ataque contra um alvo possui Vantagem Aprimorada.",
  "Bomba": "Explode em área (7x7m), causando o dano da arma a todos até 3m do centro. Aplica 1 Fratura 11 e Incendiado 16 (ou outro efeito, dependendo do tipo). Quem estiver na área pode testar Vigor 16 pra receber só metade do dano, mas recebe os efeitos negativos na hora.",
  "Único": "Este item se destrói permanentemente após o uso.",
  "Rajada": "Após acertar um alvo com esta arma, pode gastar 2 munições pra atacar um segundo alvo até 4m do primeiro.",
  "Discreto": "Após um ataque furtivo com esta arma, pode rolar um teste de Ocultar (Furtividade) com Vantagem pra retomar o estado furtivo.",
  "Queima-Roupa": "Possui Vantagem ao mirar um alvo adjacente a você. Possui Desvantagem ao disparar a mais de 6m do alvo.",
  "Colateral": "Dissipa metade do dano total aos alvos adjacentes ao alvo acertado.",
  "Incendiar": "Acertos aplicam Incendiado 20.",
  "Eletrocutar": "Acertos aplicam Eletrocutado 20.",
  "Congelar": "Acertos aplicam Congelado 20."
} as const;

export const WEAPONS_LIBRARY = [
  {
    "item": "Escudo",
    "dano": "3",
    "propriedades": "—",
    "preco": "40",
    "peso": "medio",
    "categoria": "marcial"
  },
  {
    "item": "Adaga",
    "dano": "4",
    "propriedades": "Certeiro · Ferir",
    "preco": "10",
    "peso": "leve",
    "categoria": "marcial"
  },
  {
    "item": "Espada",
    "dano": "6",
    "propriedades": "Dueler · Vorpal",
    "preco": "20",
    "peso": "medio",
    "categoria": "marcial"
  },
  {
    "item": "Lança",
    "dano": "6",
    "propriedades": "Perfurar · Vorpal",
    "preco": "20",
    "peso": "medio",
    "categoria": "marcial"
  },
  {
    "item": "Chicote",
    "dano": "6",
    "propriedades": "Dueler · Chicote",
    "preco": "35",
    "peso": "leve",
    "categoria": "marcial"
  },
  {
    "item": "Machado",
    "dano": "7",
    "propriedades": "Ferir · Vorpal",
    "preco": "35",
    "peso": "medio",
    "categoria": "marcial"
  },
  {
    "item": "Mangual",
    "dano": "7",
    "propriedades": "Impacto · Extensão",
    "preco": "35",
    "peso": "medio",
    "categoria": "marcial"
  },
  {
    "item": "Martelo",
    "dano": "7",
    "propriedades": "Impacto · Perfurar",
    "preco": "35",
    "peso": "medio",
    "categoria": "marcial"
  },
  {
    "item": "Montante",
    "dano": "14",
    "propriedades": "Perfurar · Extensão",
    "preco": "70",
    "peso": "pesado",
    "categoria": "marcial"
  },
  {
    "item": "Alabarda",
    "dano": "14",
    "propriedades": "Traspassar · Extensão",
    "preco": "70",
    "peso": "pesado",
    "categoria": "marcial"
  },
  {
    "item": "Machado Pesado",
    "dano": "14",
    "propriedades": "Ferir · Traspassar",
    "preco": "70",
    "peso": "pesado",
    "categoria": "marcial"
  },
  {
    "item": "Mangual Pesado",
    "dano": "14",
    "propriedades": "Impacto · Extensão",
    "preco": "70",
    "peso": "pesado",
    "categoria": "marcial"
  },
  {
    "item": "Martelo Pesado",
    "dano": "14",
    "propriedades": "Impacto · Contundente",
    "preco": "80",
    "peso": "pesado",
    "categoria": "marcial"
  },
  {
    "item": "Balestra",
    "dano": "10",
    "propriedades": "Certeiro · Discreto",
    "preco": "40",
    "peso": "medio",
    "categoria": "distancia"
  },
  {
    "item": "Pistola",
    "dano": "14",
    "propriedades": "Saque Rápido · Recarga 1 · Ferir · Impacto",
    "preco": "80",
    "peso": "medio",
    "categoria": "distancia"
  },
  {
    "item": "Bomba",
    "dano": "40",
    "propriedades": "Bomba · Único",
    "preco": "50",
    "peso": "leve",
    "categoria": "distancia"
  },
  {
    "item": "Arco",
    "dano": "14",
    "propriedades": "Rajada · Discreto",
    "preco": "50",
    "peso": "medio",
    "categoria": "distancia"
  },
  {
    "item": "Balestra Pesada",
    "dano": "18",
    "propriedades": "Perfurar · Recarga 1",
    "preco": "150",
    "peso": "pesado",
    "categoria": "distancia"
  },
  {
    "item": "Bacanarte",
    "dano": "18",
    "propriedades": "Queima-Roupa · Colateral · Recarga 1 · Ferir · Impacto",
    "preco": "200",
    "peso": "pesado",
    "categoria": "distancia"
  },
  {
    "item": "Mosquete",
    "dano": "20",
    "propriedades": "Perfurar · Recarga 1 · Ferir · Impacto",
    "preco": "200",
    "peso": "pesado",
    "categoria": "distancia"
  }
] as const;

