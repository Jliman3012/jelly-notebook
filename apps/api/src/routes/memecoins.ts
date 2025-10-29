import { FastifyInstance } from 'fastify';
import { throwHttpError } from '../utils/httpErrors';

const parseNumber = (value?: string): number | undefined => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const memecoinRoutes = async (app: FastifyInstance) => {
  app.get('/memecoins/trending', async (request) => {
    const { page, limit } = request.query as { page?: string; limit?: string };
    return app.memecoins.getTrendingTokens({
      page: parseNumber(page),
      limit: parseNumber(limit),
    });
  });

  app.get('/memecoins/list', async (request) => {
    const { page, limit } = request.query as { page?: string; limit?: string };
    return app.memecoins.getMemeTokenList({
      page: parseNumber(page),
      limit: parseNumber(limit),
    });
  });

  app.get('/memecoins/:address/detail', async (request) => {
    const { address } = request.params as { address?: string };
    if (!address) {
      throwHttpError(app, 'badRequest', 'Token address is required');
    }
    return app.memecoins.getMemeTokenDetail(address);
  });

  app.get('/memecoins/:address/trades', async (request) => {
    const { address } = request.params as { address?: string };
    if (!address) {
      throwHttpError(app, 'badRequest', 'Token address is required');
    }
    const { limit, exchange } = request.query as { limit?: string; exchange?: string };
    return app.memecoins.getRecentTrades(address, {
      limit: parseNumber(limit),
      exchange: exchange ?? undefined,
    });
  });
};
