'use client';

import { motion } from 'framer-motion';
import { useLiveRoundStore } from '../lib/state';
import { formatMultiplier } from '../lib/utils';

export const MultiplierTicker = () => {
  const { ticks, crashAtMs } = useLiveRoundStore();
  const current = ticks.at(-1);
  const crashed = crashAtMs !== null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-10">
      <motion.h2
        key={current?.multiplier ?? 'waiting'}
        initial={{ scale: 0.9, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="text-6xl font-black tracking-tight text-primary-foreground"
      >
        {current ? formatMultiplier(current.multiplier) : '1.00x'}
      </motion.h2>
      <p className="mt-3 text-sm text-white/60">
        {crashed
          ? 'Round crashed. Winners have been paid out.'
          : 'Multiplier updates live using VRF-seeded stochastic envelope.'}
      </p>
    </div>
  );
};
