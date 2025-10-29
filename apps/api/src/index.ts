import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from '@memecrash/sdk/config';
import { registerRoutes } from './routes';
import { registerWs } from './ws';
import { registerPlugins } from './plugins';

async function main() {
  const app = Fastify({ logger: true });

  await app.register(helmet);
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });
  await app.register(websocket);

  await registerPlugins(app);
  await registerRoutes(app);
  await registerWs(app);

  try {
    await app.listen({ port: config.server.port, host: '0.0.0.0' });
    app.log.info(`API listening on port ${config.server.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
