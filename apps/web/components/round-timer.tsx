'use client';

import { useEffect, useState } from 'react';

interface Props {
  startAt: string | null;
  lockAt: string | null;
}

export const RoundTimer = ({ startAt, lockAt }: Props) => {
  const [now, setNow] = useState(() => Date.now());
  const start = startAt ? new Date(startAt).getTime() : null;
  const lock = lockAt ? new Date(lockAt).getTime() : null;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  const phase = (() => {
    if (!start || !lock) return 'Awaiting VRF';
    if (now < start) return 'Starting';
    if (now < lock) return 'Betting';
    return 'Running';
  })();

  const msRemaining = lock ? Math.max(lock - now, 0) : 0;
  const seconds = Math.floor(msRemaining / 1000);
  const millis = Math.floor((msRemaining % 1000) / 10);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-4 text-center">
      <p className="text-xs uppercase text-white/50">Phase</p>
      <p className="text-lg font-semibold text-white/90">{phase}</p>
      <p className="mt-2 font-mono text-2xl text-primary-foreground">
        {seconds.toString().padStart(2, '0')}:{millis.toString().padStart(2, '0')}
      </p>
    </div>
  );
};
