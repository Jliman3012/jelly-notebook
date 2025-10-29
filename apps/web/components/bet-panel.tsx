'use client';

import { useState } from 'react';
import { useLiveRoundStore } from '../lib/state';
import { formatMultiplier } from '../lib/utils';

const chips = [1, 5, 10, 25, 50, 100];

export const BetPanel = () => {
  const [amount, setAmount] = useState(5);
  const { ticks } = useLiveRoundStore();
  const currentMultiplier = ticks.at(-1)?.multiplier ?? 1;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
      <h3 className="text-lg font-semibold text-white/90">Place Your Bet</h3>
      <p className="mt-1 text-xs text-white/60">Configure your stake before the round locks.</p>
      <div className="mt-4 flex items-center gap-3">
        <input
          className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-right text-lg font-semibold text-white/90"
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
        />
        <span className="text-sm text-white/60">USDC</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setAmount(chip)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-primary hover:text-primary-foreground"
          >
            {chip}
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-white/5 p-4">
        <p className="text-xs uppercase tracking-wide text-white/50">Projected Payout</p>
        <p className="text-lg font-semibold text-primary-foreground">
          {formatMultiplier(currentMultiplier)} → {(amount * currentMultiplier).toFixed(2)} USDC
        </p>
      </div>
      <button
        type="button"
        className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/30"
        disabled
      >
        Waiting for Wallet Connection
      </button>
      <p className="mt-3 text-[11px] text-white/50">
        High risk: you can lose your full stake. Crash before cashing out results in zero payout.
      </p>
    </div>
  );
};
