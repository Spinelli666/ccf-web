// Categorias dos itens do Inventário — viram os botões de filtro em cima da tabela de
// Itens Genéricos e o campo "Categoria" no diálogo de editar item.
// "Gerais" é o padrão dos itens genéricos e, como filtro, mostra todos os itens.
export const CATEGORIA_GERAIS = "Gerais";

export const CATEGORIAS_ITEM: { nome: string; icone: string }[] = [
  { nome: CATEGORIA_GERAIS, icone: "🎒" },
  { nome: "Culinária", icone: "🍲" },
  { nome: "Alquimia", icone: "⚗️" },
  { nome: "Costura", icone: "🧵" },
  { nome: "Ferraria", icone: "⚒️" },
  { nome: "Tecnomagia", icone: "🔮" },
  { nome: "Arma", icone: "⚔️" },
  { nome: "Armadura", icone: "🛡️" },
];

/** Categoria do item: a escolhida à mão, senão Arma/Armadura pelo tipo, senão Gerais. */
export function categoriaDoItem(tipo: "arma" | "armadura" | "generico", item: { categoria?: string }): string {
  if (item.categoria) return item.categoria;
  return tipo === "arma" ? "Arma" : tipo === "armadura" ? "Armadura" : CATEGORIA_GERAIS;
}
