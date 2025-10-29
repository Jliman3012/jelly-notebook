import { describe, expect, it } from 'vitest';
import { gaussianFromPrng, prngFromSeed } from '../src/prng';

describe('gaussianFromPrng', () => {
  it('returns finite numbers', () => {
    const rng = prngFromSeed(new Uint8Array([9, 9, 9, 9]));
    const values = Array.from({ length: 10 }, () => gaussianFromPrng(rng));
    expect(values.every((value) => Number.isFinite(value))).toBe(true);
  });
});
