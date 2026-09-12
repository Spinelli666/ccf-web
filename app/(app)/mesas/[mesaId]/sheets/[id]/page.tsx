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
    include: { owner: { select: { id: true, displayName: true } }, mesa: { select: { ownerId: true } } },
  });
  if (!sheet || sheet.mesaId !== mesaId) notFound();

  const isOwner = sheet.ownerId === session.user.id;
  const isGM = sheet.mesa.ownerId === session.user.id;
  if (sheet.private && !isOwner && !isGM) notFound();

  const data = emptySheetData(sheet.data as object);
  const canEditContent = isOwner || isGM || sheet.editableByOthers;

  return (
    <SheetView
      mesaId={mesaId}
      sheetId={sheet.id}
      sheetName={sheet.name}
      isPrivate={sheet.private}
      ownerName={sheet.owner.displayName}
      initialData={data}
      isMine={canEditContent}
      isOwner={isOwner}
      isGM={isGM}
      initialEditableByOthers={sheet.editableByOthers}
    />
  );
}
