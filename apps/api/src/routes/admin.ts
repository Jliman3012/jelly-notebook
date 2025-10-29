import { FastifyInstance } from 'fastify';
import { config } from '../config';
import { throwHttpError } from '../utils/httpErrors';

const authGuard = (app: FastifyInstance) => {
  return async (request: any) => {
    const header = request.headers['authorization'];
    if (!header || header !== `Bearer ${config.adminBearerToken}`) {
      throwHttpError(app, 'unauthorized', 'Invalid admin credentials');
    }
  };
};

export const adminRoutes = async (app: FastifyInstance) => {
  app.addHook('preHandler', authGuard(app));

  app.get('/rounds', async () => {
    return app.prisma.round.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  });

  app.post('/rounds/new', async () => {
    const roundNo = Math.floor(Date.now() / 1000);
    const token = await app.prisma.token.findFirst({ where: { allowlisted: true }, orderBy: { liquidityUSD: 'desc' } });
    if (!token) throwHttpError(app, 'badRequest', 'No allowlisted tokens available');
    const round = await app.prisma.round.create({
      data: {
        roundNo,
        tokenMint: token.mint,
        status: 'PENDING',
        rulesetVersion: 'v1',
        basePrice: token.liquidityUSD,
      },
    });
    return round;
  });

  app.post('/rounds/:id/lock', async (request) => {
    const params = request.params as { id: string };
    return app.prisma.round.update({
      where: { id: params.id },
      data: { status: 'LOCKED', lockAt: new Date() },
    });
  });

  app.post('/rounds/:id/settle', async (request) => {
    const params = request.params as { id: string };
    return app.prisma.round.update({
      where: { id: params.id },
      data: { status: 'SETTLED', endAt: new Date() },
    });
  });
};
