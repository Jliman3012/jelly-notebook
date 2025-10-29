import { create } from 'zustand';

export interface LiveRoundTick {
  ms: number;
  multiplier: number;
  crashed: boolean;
  maxMultiplier: number;
}

export interface LiveRoundState {
  roundId: string | null;
  tokenSymbol: string | null;
  basePrice: number | null;
  ticks: LiveRoundTick[];
  crashAtMs: number | null;
  setRound: (payload: Partial<LiveRoundState>) => void;
  pushTick: (tick: LiveRoundTick) => void;
  reset: () => void;
}

export const useLiveRoundStore = create<LiveRoundState>((set) => ({
  roundId: null,
  tokenSymbol: null,
  basePrice: null,
  ticks: [],
  crashAtMs: null,
  setRound: (payload) => set((state) => ({ ...state, ...payload })),
  pushTick: (tick) =>
    set((state) => ({
      ...state,
      ticks: [...state.ticks, tick],
      crashAtMs: tick.crashed ? tick.ms : state.crashAtMs,
    })),
  reset: () =>
    set({
      roundId: null,
      tokenSymbol: null,
      basePrice: null,
      ticks: [],
      crashAtMs: null,
    }),
}));
