'use client';

import { useState } from 'react';
import { useLiveRoundStore } from '../lib/state';
import { formatMultiplier } from '../lib/utils';

interface Props {
  onCashOut?: (ms: number) => Promise<void>;
}

export const CashOutButton = ({ onCashOut }: Props) => {
  const { ticks, crashAtMs } = useLiveRoundStore();
  const [pending, setPending] = useState(false);
  const current = ticks.at(-1);
  const crashed = crashAtMs !== null;

  const handleCashOut = async () => {
    if (!onCashOut || !current || crashed) return;
    setPending(true);
    try {
      await onCashOut(current.ms);
    } finally {
      setPending(false);
    }
  };

  const label = crashed
    ? 'Crashed'
    : pending
      ? 'Processing...'
      : current
        ? `Cash Out @ ${formatMultiplier(current.multiplier)}`
        : 'Waiting for round';

  return (
    <button
      type="button"
      onClick={handleCashOut}
      disabled={pending || crashed || !current}
      className="w-full rounded-full bg-gradient-to-r from-primary to-rose-500 py-4 text-lg font-semibold uppercase tracking-[0.3em] text-primary-foreground shadow-xl shadow-primary/40 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:bg-white/10"
    >
      {label}
    </button>
  );
};
