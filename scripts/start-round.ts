import 'dotenv/config';
import { PrismaClient, RoundStatus } from '@prisma/client';
import { lifecycleQueue } from '../apps/api/src/queues/lifecycle';

const prisma = new PrismaClient();

async function main() {
  const token = await prisma.token.findFirst({ where: { allowlisted: true } });
  if (!token) throw new Error('No allowlisted tokens');

  const round = await prisma.round.create({
    data: {
      roundNo: Math.floor(Date.now() / 1000),
      tokenMint: token.mint,
      status: RoundStatus.PENDING,
      rulesetVersion: 'v1',
      basePrice: token.liquidityUSD,
    },
  });

  await lifecycleQueue.add('start-round', { roundId: round.id });
  console.log(`Started round ${round.roundNo}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
