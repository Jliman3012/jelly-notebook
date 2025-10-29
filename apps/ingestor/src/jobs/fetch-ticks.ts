import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const prisma = new PrismaClient();

export const fetchTicks = async (logger: pino.Logger) => {
  const rounds = await prisma.round.findMany({ where: { status: { in: ['PENDING', 'RUNNING'] } }, take: 5 });
  for (const round of rounds) {
    logger.info({ round: round.roundNo }, 'fetchTicks mocked');
  }
};
