import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { throwHttpError } from '../utils/httpErrors';

const tokensQuerySchema = z.object({ allowlisted: z.string().optional() });

export const lobbyRoutes = async (app: FastifyInstance) => {
  app.get('/health', async () => ({ ok: true }));

  app.get('/tokens', async (request) => {
    const parsed = tokensQuerySchema.parse(request.query ?? {});
    const where = parsed.allowlisted === '1' ? { allowlisted: true } : {};
    return app.prisma.token.findMany({ where, orderBy: { liquidityUSD: 'desc' } });
  });

  app.get('/rounds/current', async () => {
    const round = await app.prisma.round.findFirst({
      where: { status: { in: ['RUNNING', 'LOCKED', 'PENDING'] } },
      orderBy: { createdAt: 'desc' },
      include: { token: true },
    });
    if (!round) throwHttpError(app, 'notFound', 'No active round');
    return {
      id: round.id,
      roundNo: round.roundNo,
      token: round.token,
      status: round.status,
      basePrice: round.basePrice,
      maxMultiplier: round.maxMultiplier,
      crashAtMs: round.crashAtMs,
      startAt: round.startAt,
      lockAt: round.lockAt,
      endAt: round.endAt,
    };
  });

  app.get('/rounds/:id', async (request) => {
    const params = request.params as { id: string };
    const round = await app.prisma.round.findUnique({ where: { id: params.id }, include: { token: true } });
    if (!round) throwHttpError(app, 'notFound', 'Round not found');
    return round;
  });

  app.get('/rounds/:roundNo/verify', async (request) => {
    const params = request.params as { roundNo: string };
    const roundNo = Number(params.roundNo);
    const round = await app.prisma.round.findFirst({ where: { roundNo } });
    if (!round) throwHttpError(app, 'notFound', 'Round not found');
    return {
      roundNo: round.roundNo,
      vrfResult: round.vrfResult,
      tickCid: round.pathCdnUrl,
      parameters: { alpha: 0.25, beta: 0.8, sigma: 0.4 },
      ticks: [],
    };
  });

  app.get('/rounds/leaderboard', async () => {
    const bets = await app.prisma.bet.findMany({
      where: { cashedOut: true },
      orderBy: { payoutLamports: 'desc' },
      take: 10,
    });
    return bets.map((bet) => ({
      wallet: bet.wallet,
      multiplier: bet.cashOutMs ? 1 + bet.cashOutMs / 1_000 : 1,
      payout: Number(bet.payoutLamports ?? 0) / 1_000_000,
    }));
  });
};
