import { describe, expect, it } from 'vitest';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { MemecrashClient } from '../src/program';

class MockWallet implements Wallet {
  constructor(readonly payer: PublicKey) {}
  get publicKey() {
    return this.payer;
  }
  async signTransaction(tx: any) {
    return tx;
  }
  async signAllTransactions(txs: any[]) {
    return txs;
  }
}

describe('MemecrashClient', () => {
  it('creates program instance', () => {
    const connection = new Connection('http://localhost:8899', 'confirmed');
    const wallet = new MockWallet(PublicKey.default);
    const client = new MemecrashClient({
      connection,
      wallet,
      programId: PublicKey.default,
    });
    expect(client.program.programId.toBase58()).toBe(PublicKey.default.toBase58());
  });
});
