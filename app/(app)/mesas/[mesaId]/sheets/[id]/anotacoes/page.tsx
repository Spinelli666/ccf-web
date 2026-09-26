import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CadernosClient, type Caderno } from "@/components/notes/CadernosClient";

export const dynamic = "force-dynamic";

export default async function AnotacoesPage({ params }: { params: Promise<{ mesaId: string; id: string }> }) {
  const { mesaId, id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sheet = await prisma.sheet.findUnique({
    where: { id },
    select: { id: true, name: true, mesaId: true, ownerId: true, private: true, mesa: { select: { ownerId: true } } },
  });
  if (!sheet || sheet.mesaId !== mesaId) notFound();

  const isOwner = sheet.ownerId === session.user.id;
  const isGM = sheet.mesa.ownerId === session.user.id;
  if (sheet.private && !isOwner && !isGM) notFound();

  // Quem não é dono só recebe os cadernos públicos (o layout da mesa já garante que é membro).
  const cadernos = await prisma.caderno.findMany({
    where: isOwner ? { sheetId: id } : { sheetId: id, publico: true },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
    include: { paginas: { orderBy: [{ ordem: "asc" }, { createdAt: "asc" }] } },
  });

  return (
    <CadernosClient
      mesaId={mesaId}
      sheetId={sheet.id}
      sheetName={sheet.name}
      isOwner={isOwner}
      initialCadernos={JSON.parse(JSON.stringify(cadernos)) as Caderno[]}
    />
  );
}
