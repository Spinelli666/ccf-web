import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TableChat } from "@/components/chat/TableChat";
import { SideNav } from "@/components/nav/SideNav";
import { CombateClient } from "@/components/combate/CombateClient";

export default async function MesaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ mesaId: string }>;
}) {
  const { mesaId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membro = await prisma.mesaMembro.findUnique({
    where: { mesaId_userId: { mesaId, userId: session.user.id } },
    include: { mesa: true },
  });
  if (!membro) redirect("/mesas");

  const isGM = membro.mesa.ownerId === session.user.id;
  const sheets = await prisma.sheet.findMany({
    where: isGM ? { mesaId } : { mesaId, OR: [{ private: false }, { ownerId: session.user.id }] },
    select: { id: true, name: true, ownerId: true, data: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="app-shell">
      <SideNav
        displayName={session.user.name ?? session.user.username}
        mesaId={mesaId}
        mesaNome={membro.mesa.nome}
        isGM={isGM}
      />
      <CombateClient
        mesaId={mesaId}
        isGM={isGM}
        currentUserId={session.user.id}
        sheets={JSON.parse(JSON.stringify(sheets))}
      />
      <div className="layout">
        <div className="main-col">{children}</div>
      </div>
      <TableChat mesaId={mesaId} />
    </div>
  );
}
