import { describe, expect, it } from 'vitest';
import { recomputePath } from '../src/path';

describe('recomputePath', () => {
  it('returns crash ms when multiplier collapses', () => {
    const result = recomputePath({
      seed: '01020304',
      ticks: [
        { ms: 0, multiplier: 1, crashed: false },
        { ms: 100, multiplier: 1.2, crashed: false },
        { ms: 200, multiplier: 0.5, crashed: true },
      ],
      alpha: 0.2,
      beta: 0.8,
      sigma: 0.4,
    });
    expect(result.crashAtMs).not.toBeNull();
    expect(result.maxMultiplier).toBeGreaterThanOrEqual(1.2);
  });
});
