export interface Prng {
  next: () => number;
}

export const prngFromSeed = (seed: Uint8Array): Prng => {
  let state = seed.reduce((acc, value, index) => acc ^ (value << (index % 24)), 0xdeadbeef);
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const result = (state >>> 0) / 0xffffffff;
    return result;
  };
  return { next };
};

export const gaussianFromPrng = (rng: Prng) => {
  const u1 = Math.max(rng.next(), Number.EPSILON);
  const u2 = Math.max(rng.next(), Number.EPSILON);
  const mag = Math.sqrt(-2.0 * Math.log(u1));
  const z0 = mag * Math.cos(2.0 * Math.PI * u2);
  return z0;
};
