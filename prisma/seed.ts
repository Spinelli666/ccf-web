import { PrismaClient } from "@prisma/client";
import { DEFAULT_RACES } from "../data/races";

const prisma = new PrismaClient();

async function main() {
  for (const race of DEFAULT_RACES) {
    await prisma.race.upsert({
      where: { nome: race.nome },
      update: {},
      create: {
        nome: race.nome,
        habilidades: race.habilidades,
        isDefault: true,
      },
    });
  }
  console.log(`Seeded ${DEFAULT_RACES.length} default races.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
