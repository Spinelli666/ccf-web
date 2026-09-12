import { RULEBOOK_STATIC, RACE_BONUSES } from "@/data/rulebook";
import { EFFECTS_CATALOG } from "@/data/effects";
import { ABILITIES_LIBRARY } from "@/data/classes";
import { WEAPONS_LIBRARY, PROPRIEDADES_ARMAS_INFO } from "@/data/weapons";
import { ARMOR_LIBRARY } from "@/data/armor";

export type RulebookEntry = { categoria: string; titulo: string; texto: string };

type RaceLike = { nome: string; habilidades: { nome: string; desc: string }[] };

export function buildRulebook(races: RaceLike[]): RulebookEntry[] {
  const entries: RulebookEntry[] = [...RULEBOOK_STATIC];

  Object.entries(EFFECTS_CATALOG).forEach(([nome, info]) => {
    const icone = (info as { icone?: string }).icone;
    entries.push({ categoria: "Efeitos", titulo: icone ? `${icone} ${nome}` : nome, texto: info.desc });
  });

  races.forEach((r) => {
    const bonus = (RACE_BONUSES as Record<string, string>)[r.nome] || "Bônus de perícia não cadastrado.";
    const habs = (r.habilidades || []).map((h) => `- **${h.nome}:** ${h.desc}`).join("\n");
    entries.push({
      categoria: "Raças",
      titulo: r.nome,
      texto: `**Bônus de Perícia:** ${bonus}\n\n**Habilidades Raciais**\n\n${habs}`,
    });
  });

  Object.entries(ABILITIES_LIBRARY).forEach(([classe, lista]) => {
    lista.forEach((a) => {
      const aprim = (a.aprimoramentos || [])
        .map((ap) => `- **${ap.nome}:** ${ap.efeito}`)
        .join("\n");
      let texto = `**Tipo:** ${a.tipo}\n**Custo:** ${a.custo}\n\n${a.efeito}`;
      if (aprim) texto += `\n\n**Aprimoramentos**\n\n${aprim}`;
      entries.push({ categoria: "Classes", titulo: `${classe} — ${a.nome}`, texto });
    });
  });

  Object.entries(PROPRIEDADES_ARMAS_INFO).forEach(([nome, desc]) => {
    entries.push({ categoria: "Propriedades de Armas", titulo: nome, texto: desc });
  });

  WEAPONS_LIBRARY.forEach((w) => {
    entries.push({
      categoria: "Equipamentos",
      titulo: `Arma — ${w.item}`,
      texto: `**Dano:** ${w.dano}\n**Propriedades:** ${w.propriedades}\n**Preço:** ${w.preco} moedas`,
    });
  });
  ARMOR_LIBRARY.forEach((a) => {
    entries.push({
      categoria: "Equipamentos",
      titulo: `Armadura — ${a.item} (${a.parte})`,
      texto: `**Armadura:** ${a.armadura}\n**Preço:** ${a.preco} moedas`,
    });
  });

  return entries;
}
