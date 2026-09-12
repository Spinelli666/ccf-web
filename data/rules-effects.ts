// Auto-extraído de chatbot-discord-sistema-rpg/data/sistema/efeitos/efeitos.md. Do not hand-edit generated sections.
export type RegraEfeito = { icone: string; nome: string; categoria: "positivo" | "negativo"; descricao: string };
export const EFEITOS_REGRAS: Record<string, RegraEfeito> = {
  "Inspirado": {
    "icone": "🌟",
    "nome": "Inspirado",
    "categoria": "positivo",
    "descricao": "Recebe bônus de alguma Perícia de acordo com a situação que deixar seu personagem inspirado, a critério do Narrador."
  },
  "Muito Satisfeito": {
    "icone": "💯",
    "nome": "Muito Satisfeito",
    "categoria": "positivo",
    "descricao": "Os efeitos e bônus de ❤️ PV & ⚡ PE Temporários das receitas de Culinária permanecerão até seu próximo Descanso."
  },
  "Veloz": {
    "icone": "🪽",
    "nome": "Veloz",
    "categoria": "positivo",
    "descricao": "Recebe uma Ação de ⚡ Deslocamento adicional."
  },
  "Imparável": {
    "icone": "🐂",
    "nome": "Imparável",
    "categoria": "positivo",
    "descricao": "Não é afetado por efeitos que restrinjem suas ações, como: Enraizado, Atordoado, Caído, Congelado, Petrificado, Encantado. Receber este efeito não remove qualquer outro listado."
  },
  "Persistência": {
    "icone": "👊🏼",
    "nome": "Persistência",
    "categoria": "positivo",
    "descricao": "Ao ter seus ❤️ PV reduzidos a 0 ou menos, imediatamente retorna a ter 1 ❤️ PV."
  },
  "Invulnerável": {
    "icone": "🦾",
    "nome": "Invulnerável",
    "categoria": "positivo",
    "descricao": "Você não pode sofrer dano de criaturas ou objetos."
  },
  "Invisível": {
    "icone": "🩻",
    "nome": "Invisível",
    "categoria": "positivo",
    "descricao": "Você está paranaturalmente oculto da visão de todos e não pode ser alvo de ataques físicos ou mágicos que requisitem enxergá-lo."
  },
  "Furtivo": {
    "icone": "👤",
    "nome": "Furtivo",
    "categoria": "positivo",
    "descricao": "Você está naturalmente oculto no escuro ou fora de vista, e alvos só irão percebê-lo caso o avistarem ou testem Inteligência, precisando de um resultado maior que o seu valor de 🌑 Furtivo rolado. Este teste de Inteligência ocorre sempre que você tentar realizar um Ataque Furtivo contra um alvo, e se ele não conseguir detectá-lo você terá ▲ Vantagem no teste. Atacar furtivamente remove o estado Furtivo, e não poderá se ocultar novamente até a próxima Rodada."
  },
  "Infravião": {
    "icone": "👁‍🗨",
    "nome": "Infravião",
    "categoria": "positivo",
    "descricao": "Você consegue enxergar no escuro e possui Vantagem para detectar personagens furtivos."
  },
  "Despertar Psionico": {
    "icone": "🧿",
    "nome": "Despertar Psionico",
    "categoria": "positivo",
    "descricao": "Você se torna capaz de enxergar através do Véu da Realidade, percebendo rastros de energia paranormal e fendas dimensionais, criaturas e objetos ocultos, além de auras de poder e de humor. Nesse estado, com devido treinamento, o despertado é capaz de dobrar a realidade ao seu favor e realizar milagres a custo de sua própria sanidade e energia vital."
  },
  "Exaustão": {
    "icone": "💤",
    "nome": "Exaustão",
    "categoria": "negativo",
    "descricao": "Adquirido de diversas formas mas principalmente ao passar mais de 24h acordado, ou ao preencher os níveis de 🍖 / 💧, este Efeito Negativo aplica Desvantagem cumulativa em todo tipo de teste até que seja removido com um Descanso. Caso preencha seus níveis de 🍖 / 💧 ao mesmo tempo, este efeito vira uma Desvantagem Aprimorada que pode continuar a acumular por outras fontes."
  },
  "Fratura": {
    "icone": "⛓️‍💥",
    "nome": "Fratura",
    "categoria": "negativo",
    "descricao": "Você foi gravemente ferido, e para cada ponto de Fratura que possuir seus ❤️ PV totais são reduzidos em -5. Além disso, acumular 5 Fraturas o deixa ☠️ Derrotado. Pode ser removido com um 🧿 Descanso Longo ou com um 🧼 Conjunto Cirúrgico."
  },
  "Intoxicado": {
    "icone": "☣️",
    "nome": "Intoxicado",
    "categoria": "negativo",
    "descricao": "Não é afetado por efeitos de 🧪 Alquimia. Pode ser removido por um 🧿 Descanso Longo ou 🧪 Tônico Purificador."
  },
  "Sangramento": {
    "icone": "🩸",
    "nome": "Sangramento",
    "categoria": "negativo",
    "descricao": "Sempre que realizar testes de Precisão, Evasão, Força e Destreza, você receberá 5 🧊 de dano de Sangramento. Fora de Combate este efeito ocorre a cada 10 minutos. Pode ser removido com 🧴 Bandagem Curativa e 🧼 Conjunto Cirúrgico."
  },
  "Envenenado": {
    "icone": "🐍",
    "nome": "Envenenado",
    "categoria": "negativo",
    "descricao": "Enquanto com este efeito, sempre que receber qualquer tipo de dano você receberá 5 ☠️ dano de Veneno adicional. Caso não receba dano enquanto envenenado, quando o efeito terminar você receberá 20 ☠️ de dano. Também adiciona 1 ☠️ ponto de Toxidade."
  },
  "Enfraquecido": {
    "icone": "💨",
    "nome": "Enfraquecido",
    "categoria": "negativo",
    "descricao": "Até o final do seu próximo turno, sempre que você causar qualquer tipo de dano ou regeneração de ❤️ PV, este valor será reduzido pela metade."
  },
  "Incendiado": {
    "icone": "🔥",
    "nome": "Incendiado",
    "categoria": "negativo",
    "descricao": "Está coberto de chamas, recebendo 10 🔥 dano de Fogo a cada rodada enquanto o efeito durar."
  },
  "Eletrocutado": {
    "icone": "⚡️",
    "nome": "Eletrocutado",
    "categoria": "negativo",
    "descricao": "Recebe 15 ⚡ dano Elétrico instantâneo e deve testar Vigor contra 🧠 Atordoado adicionalmente."
  },
  "Congelado": {
    "icone": "❄️",
    "nome": "Congelado",
    "categoria": "negativo",
    "descricao": "Não pode usar ⚡ Deslocamento e possui -6 em testes de Perícia. Também recebe 5 ❄️ dano de Gelo a cada rodada enquanto o efeito durar."
  },
  "Amaldiçoado": {
    "icone": "⚫",
    "nome": "Amaldiçoado",
    "categoria": "negativo",
    "descricao": "Está coberto de anomalia extraplanar, recebendo 5 💀 dano Imaterial a cada rodada enquanto o efeito durar. Não pode receber nenhuma regeneração de ❤️ PV ou ⚡ PE durante este efeito, exceto se for de origem paranormal, e neste caso a regeneração é reduzida pela metade."
  },
  "Petrificado": {
    "icone": "🗿",
    "nome": "Petrificado",
    "categoria": "negativo",
    "descricao": "Está paralisado e não pode realizar nenhuma ação ou teste até terminar o efeito, mas recebe 20 🛡️."
  },
  "Paralisado": {
    "icone": "🕓",
    "nome": "Paralisado",
    "categoria": "negativo",
    "descricao": "Está paralisado e não pode realizar nenhuma ação ou teste até terminar o efeito."
  },
  "Controlado": {
    "icone": "🔗",
    "nome": "Controlado",
    "categoria": "negativo",
    "descricao": "Seu personagem será completamente controlado por quem o aplicou este efeito, mas apenas fisicamente, com você mantendo sua consciência e personalidade própria."
  },
  "Encantado": {
    "icone": "🪄",
    "nome": "Encantado",
    "categoria": "negativo",
    "descricao": "Seu personagem será manipulado verbalmente por quem o aplicou este efeito, podendo tomar decisões e dar ordens a você contra sua vontade."
  },
  "Atordoado": {
    "icone": "💫",
    "nome": "Atordoado",
    "categoria": "negativo",
    "descricao": "Deve passar em um teste de Vigor Dif.20 no início de seu turno para realizar qualquer Ação nesta rodada. Também deve passar em um teste de Vigor Dif.16 antes de rolar sua Evasão ao ser alvo de ataques ou receberá o dano instantaneamente. O número de rodadas que você passou atordoado equivale a quantas rodadas você não poderá ser atordoado novamente."
  },
  "Agarrado": {
    "icone": "⛓️",
    "nome": "Agarrado",
    "categoria": "negativo",
    "descricao": "Está capturado como refém e não pode realizar Ações que requeiram o movimento dos braços e pernas – e caso seja descrito que tamparam sua boca também não poderá testar Persuasão. Todo início de turno seu e do inimigo que o agarrou ocorre um embate de Força para determinar se o efeito continua ou você se liberta do controle."
  },
  "Inconsciente": {
    "icone": "💤",
    "nome": "Inconsciente",
    "categoria": "negativo",
    "descricao": "Sono — Você cai desacordado, não podendo realizar nenhum tipo de ação, se mover ou falar."
  },
  "Derrotado": {
    "icone": "☠️",
    "nome": "Derrotado",
    "categoria": "negativo",
    "descricao": "Você recebeu um golpe fatal e está 🔍 Inconsciente, não podendo realizar nenhum tipo de ação, se mover ou falar, mas também está gravemente ferido, à beira da morte, e por isso deve realizar o teste de Julgamento."
  },
  "Caído": {
    "icone": "🏃🏽‍♂️",
    "nome": "Caído",
    "categoria": "negativo",
    "descricao": "Caiu no chão e recebe Desvantagem em qualquer teste de Perícia. Em seu turno você pode usar uma ⛺ Ação Curta para se levantar. Além disso, caso você esteja mantendo uma habilidade do tipo Foco ela é removida."
  },
  "Desarmado": {
    "icone": "👋",
    "nome": "Desarmado",
    "categoria": "negativo",
    "descricao": "Sua arma caiu no chão a dois metros de você. Você pode juntá-la com uma ⛺ Ação Curta."
  },
  "Lento": {
    "icone": "🐢",
    "nome": "Lento",
    "categoria": "negativo",
    "descricao": "Recebe -5m de ⚡ Deslocamento."
  },
  "Enraizado": {
    "icone": "🕸",
    "nome": "Enraizado",
    "categoria": "negativo",
    "descricao": "Não pode usar ⚡ Deslocamento."
  },
  "Cego": {
    "icone": "👁",
    "nome": "Cego",
    "categoria": "negativo",
    "descricao": "Não pode enxergar e recebe Desvantagem Aprimorada em qualquer teste que requeira sua visão."
  },
  "Mudo": {
    "icone": "👄",
    "nome": "Mudo",
    "categoria": "negativo",
    "descricao": "Não pode falar e recebe Desvantagem Aprimorada em qualquer teste que requeira sua fala."
  },
  "Surdo": {
    "icone": "👂",
    "nome": "Surdo",
    "categoria": "negativo",
    "descricao": "Não pode ouvir e recebe Desvantagem Aprimorada em qualquer teste que requeira sua audição."
  },
  "Irado": {
    "icone": "💢",
    "nome": "Irado",
    "categoria": "negativo",
    "descricao": "Seu personagem será tomado de uma cólera furiosa e atacará tudo e todos ao redor descontroladamente, incluindo os aliados mais próximos, até o término do efeito."
  },
  "Intimidado": {
    "icone": "❗️",
    "nome": "Intimidado",
    "categoria": "negativo",
    "descricao": "Tem -4 em testes de Perícia contra quem o intimidou."
  },
  "Apavorado": {
    "icone": "♨️",
    "nome": "Apavorado",
    "categoria": "negativo",
    "descricao": "É obrigado tentar fugir da batalha ou de quem lhe apavorou enquanto durar esta condição."
  }
};
