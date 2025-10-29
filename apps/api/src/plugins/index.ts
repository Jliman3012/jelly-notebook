import { registerLifecycleWorker } from '../queues/lifecycle';
import fastifyPlugin from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { config } from '@memecrash/sdk/config';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: ReturnType<typeof createClient>;
  }
}

export const registerPlugins = fastifyPlugin(async (fastify) => {
  const prisma = new PrismaClient();
  const redis = createClient({ url: config.redis.url });
  redis.on('error', (error) => fastify.log.error({ error }, 'Redis error'));
  await redis.connect();

  fastify.decorate('prisma', prisma);
  fastify.decorate('redis', redis);

  registerLifecycleWorker();

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    await redis.disconnect();
  });
});
