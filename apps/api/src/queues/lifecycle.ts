import { Queue, Worker } from 'bullmq';
import { config } from '@memecrash/sdk/config';

const connection = { connection: { url: config.redis.url } };

export const lifecycleQueue = new Queue('round-lifecycle', connection);

export const registerLifecycleWorker = () => {
  const worker = new Worker(
    'round-lifecycle',
    async (job) => {
      switch (job.name) {
        case 'start-round':
          return { status: 'started' };
        case 'lock-round':
          return { status: 'locked' };
        case 'settle-round':
          return { status: 'settled' };
        default:
          throw new Error(`Unknown job ${job.name}`);
      }
    },
    connection
  );
  return worker;
};
