import { gaussianFromPrng, prngFromSeed } from './prng';

export interface PathTick {
  ms: number;
  multiplier: number;
  crashed: boolean;
}

export interface PathParams {
  seed: string;
  ticks: PathTick[];
  alpha: number;
  beta: number;
  sigma: number;
}

export interface PathResult {
  crashAtMs: number | null;
  maxMultiplier: number;
}

export const recomputePath = ({ seed, ticks, alpha, beta, sigma }: PathParams): PathResult => {
  const rng = prngFromSeed(Buffer.from(seed, 'hex'));
  let maxMultiplier = 1;
  let crashAtMs: number | null = null;

  for (const tick of ticks) {
    const gaussianShock = gaussianFromPrng(rng) * sigma * beta;
    const drift = alpha * (tick.multiplier - 1);
    const projected = Math.max(0, 1 + drift + gaussianShock);
    if (tick.multiplier > maxMultiplier) {
      maxMultiplier = tick.multiplier;
    }
    if (crashAtMs === null && projected <= 0.01) {
      crashAtMs = tick.ms;
    }
  }

  return { crashAtMs, maxMultiplier };
};
