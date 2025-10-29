import { describe, expect, it } from 'vitest';
import { prngFromSeed } from '../src/prng';

describe('prngFromSeed', () => {
  it('produces deterministic sequence', () => {
    const seed = new Uint8Array([1, 2, 3, 4]);
    const rng1 = prngFromSeed(seed);
    const rng2 = prngFromSeed(seed);
    const seq1 = Array.from({ length: 5 }, () => rng1.next());
    const seq2 = Array.from({ length: 5 }, () => rng2.next());
    expect(seq1).toEqual(seq2);
  });
});
