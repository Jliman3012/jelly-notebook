import 'dotenv/config';
import { Queue } from 'bullmq';
import { createClient } from 'redis';
import pino from 'pino';
import { discoverTokens } from './jobs/discover-tokens';
import { fetchTicks } from './jobs/fetch-ticks';
import { buildPath } from './jobs/build-path';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const redis = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
redis.on('error', (error) => logger.error({ error }, 'Redis error'));

const tickQueue = new Queue('ticks', { connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' } });

async function main() {
  await redis.connect();
  logger.info('Ingestor ready');

  await discoverTokens(logger);
  await fetchTicks(logger);
  await buildPath(logger);
  await tickQueue.add('heartbeat', { at: Date.now() });
}

main().catch((error) => {
  logger.error({ error }, 'Ingestor crashed');
  process.exit(1);
});
