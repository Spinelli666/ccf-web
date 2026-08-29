import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SheetView } from "@/components/sheet/SheetView";
import { emptySheetData } from "@/lib/sheet-types";

export const dynamic = "force-dynamic";

export default async function SheetPage({ params }: { params: Promise<{ mesaId: string; id: string }> }) {
  const { mesaId, id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sheet = await prisma.sheet.findUnique({
    where: { id },
    include: { owner: { select: { id: true, displayName: true } } },
  });
  if (!sheet || sheet.mesaId !== mesaId) notFound();
  if (sheet.private && sheet.ownerId !== session.user.id) notFound();

  const data = emptySheetData(sheet.data as object);
  const isMine = sheet.ownerId === session.user.id;

  return (
    <SheetView
      mesaId={mesaId}
      sheetId={sheet.id}
      sheetName={sheet.name}
      isPrivate={sheet.private}
      ownerName={sheet.owner.displayName}
      initialData={data}
      isMine={isMine}
    />
  );
}
