import { loadEnvironment, getConfig } from '@memecrash/sdk/config';
import { Queue } from 'bullmq';
import { createClient } from 'redis';
import pino from 'pino';
import { discoverTokens } from './jobs/discover-tokens';
import { fetchTicks } from './jobs/fetch-ticks';
import { buildPath } from './jobs/build-path';

loadEnvironment();
const config = getConfig();

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const redis = createClient({ url: config.redisUrl });
redis.on('error', (error) => logger.error({ error }, 'Redis error'));

const tickQueue = new Queue('ticks', { connection: { url: config.redisUrl } });

async function main() {
  await redis.connect();
  logger.info({ priceMode: config.priceMode, cluster: config.cluster }, 'Ingestor ready');

  await discoverTokens(logger);
  await fetchTicks(logger);
  await buildPath(logger);
  await tickQueue.add('heartbeat', { at: Date.now() });
}

main().catch((error) => {
  logger.error({ error }, 'Ingestor crashed');
  process.exit(1);
});
