import { notFound } from 'next/navigation';
import { apiGet } from '../../../lib/api';
import { formatMultiplier } from '../../../lib/utils';
import { recomputePath } from '@memecrash/sdk';

interface RoundVerifyDto {
  roundNo: number;
  vrfResult: string;
  tickCid: string;
  parameters: {
    alpha: number;
    beta: number;
    sigma: number;
  };
  ticks: { ms: number; multiplier: number; crashed: boolean }[];
}

export default async function VerifyPage({ params }: { params: { roundNo: string } }) {
  const roundNo = Number(params.roundNo);
  if (Number.isNaN(roundNo)) {
    notFound();
  }
  const data = await apiGet<RoundVerifyDto>(`/rounds/${roundNo}/verify`);
  const reconstructed = recomputePath({
    seed: data.vrfResult,
    ticks: data.ticks,
    alpha: data.parameters.alpha,
    beta: data.parameters.beta,
    sigma: data.parameters.sigma,
  });
  const valid =
    reconstructed.crashAtMs === data.ticks.find((tick) => tick.crashed)?.ms &&
    Math.abs(
      reconstructed.maxMultiplier -
        Math.max(1, ...data.ticks.map((tick) => tick.multiplier))
    ) < 0.05;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="rounded-3xl border border-white/10 bg-black/30 p-6">
        <h1 className="text-3xl font-bold text-white/90">Verify Round #{data.roundNo}</h1>
        <p className="mt-2 text-sm text-white/60">
          VRF Seed: <span className="font-mono text-white/80">{data.vrfResult}</span>
        </p>
        <p className="mt-1 text-xs text-white/50">Tick archive stored at: {data.tickCid}</p>
      </header>
      <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <h2 className="text-lg font-semibold text-white/90">Deterministic Reconstruction</h2>
        <p className="mt-2 text-sm text-white/60">
          Max multiplier observed: {formatMultiplier(reconstructed.maxMultiplier)}
        </p>
        <p className="text-sm text-white/60">Crash occurred at {reconstructed.crashAtMs} ms.</p>
        <p className="mt-4 text-base font-semibold text-primary-foreground">
          {valid ? 'Verified ✅ – Server path matches deterministic recomputation.' : 'Mismatch ⚠️ – Investigate inputs.'}
        </p>
      </section>
    </div>
  );
}
