import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { betRoutes } from '../src/routes/bets';

describe('bet quote route', () => {
  it('returns payout details', async () => {
    const app = Fastify();
    // @ts-ignore
    app.decorate('prisma', {});
    // @ts-ignore
    app.decorate('redis', {});
    await app.register(betRoutes, { prefix: '/bets' });
    const response = await app.inject({
      method: 'POST',
      url: '/bets/quote',
      payload: { amount: 100 },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.payout).toBeCloseTo(97, 1);
  });
});
