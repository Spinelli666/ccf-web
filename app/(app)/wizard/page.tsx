import { prisma } from "@/lib/prisma";
import { WizardClient } from "@/components/wizard/WizardClient";

export const dynamic = "force-dynamic";

export default async function WizardPage() {
  const races = await prisma.race.findMany({ orderBy: { nome: "asc" } });
  return (
    <WizardClient
      races={races.map((r) => ({ nome: r.nome, habilidades: r.habilidades as { nome: string; desc: string }[] }))}
    />
  );
}
