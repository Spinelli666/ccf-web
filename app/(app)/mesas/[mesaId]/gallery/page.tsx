import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GalleryClient } from "@/components/gallery/GalleryClient";

export const dynamic = "force-dynamic";

export default async function GalleryPage({ params }: { params: Promise<{ mesaId: string }> }) {
  const { mesaId } = await params;
  const session = await auth();
  const sheets = await prisma.sheet.findMany({
    where: { mesaId, OR: [{ private: false }, { ownerId: session!.user.id }] },
    include: { owner: { select: { displayName: true, username: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <GalleryClient
      mesaId={mesaId}
      sheets={JSON.parse(JSON.stringify(sheets))}
      currentUserId={session!.user.id}
    />
  );
}
