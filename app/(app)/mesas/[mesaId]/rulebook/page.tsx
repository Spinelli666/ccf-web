import { prisma } from "@/lib/prisma";
import { buildRulebook } from "@/lib/rulebook";
import { RulebookClient } from "@/components/rulebook/RulebookClient";

export const dynamic = "force-dynamic";

export default async function RulebookPage() {
  const races = await prisma.race.findMany({ orderBy: { nome: "asc" } });
  const entries = buildRulebook(
    races.map((r) => ({ nome: r.nome, habilidades: r.habilidades as { nome: string; desc: string }[] }))
  );
  return <RulebookClient entries={entries} />;
}
