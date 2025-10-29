import pino from 'pino';
import { prngFromSeed } from '@memecrash/sdk';

export const buildPath = async (logger: pino.Logger) => {
  const rng = prngFromSeed(new Uint8Array([1, 2, 3, 4]));
  const ticks = Array.from({ length: 10 }, (_, index) => ({
    ms: index * 200,
    multiplier: 1 + rng.next(),
    crashed: false,
  }));
  logger.info({ ticks }, 'buildPath simulated');
};
