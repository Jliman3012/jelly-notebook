import { describe, expect, it } from 'vitest';
import { buildPath } from '../src/jobs/build-path';

describe('buildPath', () => {
  it('generates deterministic ticks', async () => {
    const logs: unknown[] = [];
    await buildPath({ info: (payload: unknown) => logs.push(payload) } as any);
    expect(logs.length).toBe(1);
  });
});
