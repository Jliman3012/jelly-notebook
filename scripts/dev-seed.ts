import 'dotenv/config';
import { PrismaClient, RoundStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.token.upsert({
    where: { mint: 'PLAY111111111111111111111111111111111111' },
    update: {},
    create: {
      mint: 'PLAY111111111111111111111111111111111111',
      symbol: 'PLAY',
      name: 'MemeCrash Play Token',
      liquidityUSD: 500000,
      tags: ['meme', 'play'],
    },
  });

  for (let i = 0; i < 3; i++) {
    await prisma.round.create({
      data: {
        roundNo: 1_000 + i,
        tokenMint: 'PLAY111111111111111111111111111111111111',
        status: RoundStatus.SETTLED,
        rulesetVersion: 'v1',
        basePrice: 1,
        maxMultiplier: 3 + i,
        crashAtMs: 12_000 + i * 500,
      },
    });
  }

  console.log('Seeded tokens and rounds');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
