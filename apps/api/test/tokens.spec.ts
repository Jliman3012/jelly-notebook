import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { lobbyRoutes } from '../src/routes/lobby';

const tokens = [
  { mint: 'mint1', symbol: 'AAA', name: 'Token AAA', liquidityUSD: 1000, allowlisted: true },
];

const prismaMock = {
  token: {
    findMany: async () => tokens,
  },
  round: {
    findFirst: async () => ({
      id: 'round1',
      roundNo: 1,
      token: tokens[0],
      status: 'PENDING',
      basePrice: 1,
      maxMultiplier: 3,
      crashAtMs: null,
      startAt: new Date(),
      lockAt: new Date(),
      endAt: null,
    }),
  },
  bet: {
    findMany: async () => [],
  },
};

describe('lobby routes', () => {
  const app = Fastify();
  // @ts-ignore
  app.decorate('prisma', prismaMock);
  // @ts-ignore
  app.decorate('redis', {});

  beforeAll(async () => {
    await app.register(lobbyRoutes, { prefix: '/' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns tokens', async () => {
    const response = await app.inject({ method: 'GET', url: '/tokens?allowlisted=1' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(1);
  });

  it('returns current round', async () => {
    const response = await app.inject({ method: 'GET', url: '/rounds/current' });
    expect(response.statusCode).toBe(200);
    expect(response.json().roundNo).toBe(1);
  });
});
