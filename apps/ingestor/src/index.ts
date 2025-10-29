import { Queue } from 'bullmq';
import { createClient } from 'redis';
import pino from 'pino';
import { config } from '@memecrash/sdk/config';
import { discoverTokens } from './jobs/discover-tokens';
import { fetchTicks } from './jobs/fetch-ticks';
import { buildPath } from './jobs/build-path';

const logger = pino({ level: config.logging.level });

const redis = createClient({ url: config.redis.url });
redis.on('error', (error) => logger.error({ error }, 'Redis error'));

const tickQueue = new Queue('ticks', { connection: { url: config.redis.url } });

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
