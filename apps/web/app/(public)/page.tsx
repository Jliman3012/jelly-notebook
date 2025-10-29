import Link from 'next/link';
import { fetchCurrentRound, fetchTokens } from '../../lib/api';
import { formatUsd } from '../../lib/utils';

export default async function LobbyPage() {
  const [round, tokens] = await Promise.all([fetchCurrentRound(), fetchTokens()]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
      <section className="rounded-3xl bg-white/5 p-8 shadow-xl shadow-primary/30 backdrop-blur">
        <h1 className="text-4xl font-bold text-primary-foreground">MemeCrash</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          High-octane Solana crash game backed by live memecoin volatility. Bet in
          USDC or HOUSE tokens, cash out before the crash, and verify every tick
          using on-chain VRF proofs.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Live Round</p>
            <p className="text-lg font-semibold text-white/90">#{round.roundNo}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Token</p>
            <p className="text-lg font-semibold text-white/90">
              {round.token.symbol} · {round.token.name}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Liquidity</p>
            <p className="text-lg font-semibold text-white/90">{formatUsd(round.token.liquidityUSD)}</p>
          </div>
          <Link
            href="/play"
            className="ml-auto rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/40"
          >
            Enter Play Mode
          </Link>
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl bg-white/5 p-8 shadow-inner shadow-primary/10 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white/90">Allowlisted Tokens</h2>
          <span className="text-xs text-white/60">Live curated memecoins</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {tokens.map((token) => (
            <div
              key={token.mint}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div>
                <p className="text-base font-semibold text-white/90">{token.symbol}</p>
                <p className="text-xs text-white/60">{token.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-white/50">Liquidity</p>
                <p className="text-sm font-medium text-primary-foreground">
                  {formatUsd(token.liquidityUSD)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
