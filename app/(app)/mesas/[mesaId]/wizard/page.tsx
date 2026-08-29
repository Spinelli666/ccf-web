import { prisma } from "@/lib/prisma";
import { WizardClient } from "@/components/wizard/WizardClient";

export const dynamic = "force-dynamic";

export default async function WizardPage({ params }: { params: Promise<{ mesaId: string }> }) {
  const { mesaId } = await params;
  const races = await prisma.race.findMany({ orderBy: { nome: "asc" } });
  return (
    <WizardClient
      mesaId={mesaId}
      races={races.map((r) => ({ nome: r.nome, habilidades: r.habilidades as { nome: string; desc: string }[] }))}
    />
  );
}
