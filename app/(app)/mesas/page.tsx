import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MesasClient } from "@/components/mesas/MesasClient";

export const dynamic = "force-dynamic";

export default async function MesasPage() {
  const session = await auth();
  const mesas = await prisma.mesa.findMany({
    where: { membros: { some: { userId: session!.user.id } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <MesasClient
      mesas={mesas.map((m) => ({ id: m.id, nome: m.nome, codigo: m.codigo, ownerId: m.ownerId }))}
      currentUserId={session!.user.id}
    />
  );
}
