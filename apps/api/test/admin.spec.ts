import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { adminRoutes } from '../src/routes/admin';
import { config } from '../src/config';

describe('admin routes', () => {
  const app = Fastify();
  // @ts-ignore
  app.decorate('prisma', {
    round: {
      findMany: async () => [{ id: 'id', roundNo: 1, status: 'PENDING' }],
      update: async (args: any) => args.data,
      create: async (args: any) => args.data,
    },
    token: {
      findFirst: async () => ({ mint: 'mint', liquidityUSD: 1 }),
    },
  });
  // @ts-ignore
  app.decorate('redis', {});

  beforeAll(async () => {
    await app.register(adminRoutes, { prefix: '/admin' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects missing auth', async () => {
    const response = await app.inject({ method: 'GET', url: '/admin/rounds' });
    expect(response.statusCode).toBe(401);
  });

  it('lists rounds with auth', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/admin/rounds',
      headers: { authorization: `Bearer ${config.adminBearerToken}` },
    });
    expect(response.statusCode).toBe(200);
  });
});
