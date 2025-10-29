'use client';

import { useEffect } from 'react';
import { useLiveRoundStore } from '../lib/state';

interface Props {
  roundId: string;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000/round';

const LiveSocket = ({ roundId }: Props) => {
  const setRound = useLiveRoundStore((state) => state.setRound);
  const pushTick = useLiveRoundStore((state) => state.pushTick);

  useEffect(() => {
    const url = `${WS_URL}/${roundId}`;
    const socket = new WebSocket(url);

    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'snapshot') {
        setRound({
          roundId,
          tokenSymbol: payload.tokenSymbol,
          basePrice: payload.basePrice,
          ticks: payload.ticks,
          crashAtMs: payload.crashAtMs ?? null,
        });
      }
      if (payload.type === 'tick') {
        pushTick(payload.tick);
      }
    });

    return () => socket.close();
  }, [roundId, pushTick, setRound]);

  return null;
};

export default LiveSocket;
