'use client';

import { useMemo } from 'react';
import { useLiveRoundStore } from '../lib/state';

export const MiniChart = () => {
  const { ticks } = useLiveRoundStore();
  const points = useMemo(() => ticks.slice(-200), [ticks]);

  return (
    <svg viewBox="0 0 400 160" className="h-40 w-full">
      <defs>
        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff2d55" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#1a1b4b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="400" height="160" fill="url(#chartGradient)" opacity="0.15" />
      <polyline
        fill="none"
        stroke="#ff2d55"
        strokeWidth="3"
        strokeLinecap="round"
        points={points
          .map((tick, index) => {
            const x = (index / Math.max(points.length - 1, 1)) * 400;
            const y = 160 - Math.min(tick.multiplier * 25, 150);
            return `${x},${y}`;
          })
          .join(' ')}
      />
    </svg>
  );
};
