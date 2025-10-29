import type { Idl } from '@coral-xyz/anchor';

export const MemecrashIdl = {
  version: '0.1.0',
  name: 'memecrash',
  instructions: [
    {
      name: 'initialize',
      accounts: [],
      args: [],
    },
  ],
} satisfies Idl;

export type Memecrash = typeof MemecrashIdl;
