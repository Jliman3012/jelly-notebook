import { registerLifecycleWorker } from '../queues/lifecycle';
import fastifyPlugin from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { config } from '../config';
import { MemecoinService } from '../services/memecoins';
import WebSocket from 'ws';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: ReturnType<typeof createClient>;
    memecoins: MemecoinService;
  }
}

export const registerPlugins = fastifyPlugin(async (fastify) => {
  const prisma = new PrismaClient();
  const redis = createClient({ url: config.redisUrl });
  redis.on('error', (error) => fastify.log.error({ error }, 'Redis error'));
  await redis.connect();

  fastify.decorate('prisma', prisma);
  fastify.decorate('redis', redis);

  let memecoins: MemecoinService | undefined;
  try {
    memecoins = new MemecoinService({
      birdeyeApiKey: config.birdeye.apiKey ?? '',
      bitqueryApiKey: config.bitquery.apiKey ?? '',
      logger: fastify.log,
      WebSocketCtor: WebSocket,
    });
    await memecoins.start();
    fastify.decorate('memecoins', memecoins);
  } catch (error) {
    fastify.log.error({ error }, 'Failed to initialize memecoin services');
    throw error;
  }

  registerLifecycleWorker();

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    await redis.disconnect();
    await memecoins?.stop();
  });
});
