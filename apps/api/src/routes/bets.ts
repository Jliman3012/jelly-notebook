import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const quoteSchema = z.object({ amount: z.number().min(1) });

export const betRoutes = async (app: FastifyInstance) => {
  app.post('/quote', async (request) => {
    const { amount } = quoteSchema.parse(request.body ?? {});
    const minBet = 1;
    const maxBet = 5000;
    const feeBps = 300;
    const payout = amount * (1 - feeBps / 10_000);
    return { minBet, maxBet, feeBps, payout };
  });
};
