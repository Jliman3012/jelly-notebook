import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { fetchCurrentRound } from '../../lib/api';
import { BetPanel } from '../../components/bet-panel';
import { CashOutButton } from '../../components/cash-out-button';
import { MultiplierTicker } from '../../components/multiplier-ticker';
import { MiniChart } from '../../components/mini-chart';
import { RoundTimer } from '../../components/round-timer';
import { Leaderboard } from '../../components/leaderboard';

const LiveSocket = dynamic(() => import('../../components/ws-subscriber'), { ssr: false });

export default async function PlayPage() {
  const round = await fetchCurrentRound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <MultiplierTicker />
            <RoundTimer startAt={round.startAt} lockAt={round.lockAt} />
          </div>
          <div className="rounded-3xl border border-white/5 bg-black/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white/90">{round.token.symbol}</h2>
                <p className="text-xs text-white/60">{round.token.name}</p>
              </div>
              <p className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">Round #{round.roundNo}</p>
            </div>
            <div className="mt-4">
              <MiniChart />
            </div>
          </div>
          <div className="rounded-3xl border border-white/5 bg-black/30 p-6">
            <h3 className="text-sm uppercase text-white/50">Live Cash Out</h3>
            <CashOutButton />
          </div>
        </div>
        <div className="space-y-6">
          <BetPanel />
          <Suspense fallback={<div className="rounded-3xl bg-black/20 p-6 text-white/40">Loading leaderboard...</div>}>
            {/* @ts-expect-error Async Server Component */}
            <Leaderboard />
          </Suspense>
        </div>
      </div>
      <LiveSocket roundId={round.id} />
    </div>
  );
}
