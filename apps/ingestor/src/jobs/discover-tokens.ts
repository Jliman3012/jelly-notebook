import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const prisma = new PrismaClient();

export const discoverTokens = async (logger: pino.Logger) => {
  const allowlisted = [
    {
      mint: 'PLAY111111111111111111111111111111111111',
      symbol: 'PLAY',
      name: 'MemeCrash Play Token',
      liquidityUSD: 500_000,
      tags: ['meme', 'play'],
    },
  ];

  for (const token of allowlisted) {
    await prisma.token.upsert({
      where: { mint: token.mint },
      update: token,
      create: { ...token, allowlisted: true },
    });
  }

  logger.info({ count: allowlisted.length }, 'discoverTokens complete');
};
