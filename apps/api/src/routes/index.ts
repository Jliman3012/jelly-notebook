import { FastifyInstance } from 'fastify';
import { lobbyRoutes } from './lobby';
import { adminRoutes } from './admin';
import { betRoutes } from './bets';
import { memecoinRoutes } from './memecoins';

export const registerRoutes = async (app: FastifyInstance) => {
  app.register(lobbyRoutes, { prefix: '/' });
  app.register(betRoutes, { prefix: '/bets' });
  app.register(adminRoutes, { prefix: '/admin' });
  app.register(memecoinRoutes, { prefix: '/api' });
};
