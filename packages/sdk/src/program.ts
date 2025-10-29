import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { MemecrashIdl, type Memecrash } from './idl';

export interface MemecrashClientConfig {
  connection: Connection;
  wallet: Wallet;
  programId: PublicKey;
}

export class MemecrashClient {
  readonly program: Program<Memecrash>;

  constructor({ connection, wallet, programId }: MemecrashClientConfig) {
    const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    this.program = new Program<Memecrash>(MemecrashIdl as Memecrash, programId, provider);
  }

  async initialize(admin: PublicKey, feeBps: number, treasury: PublicKey) {
    return this.program.methods
      .initialize({ feeBps, treasury })
      .accounts({ admin, systemProgram: SystemProgram.programId })
      .rpc();
  }

  async placeBet(roundPda: PublicKey, user: PublicKey, amount: BN) {
    return this.program.methods
      .placeBet(amount)
      .accounts({ round: roundPda, user, systemProgram: SystemProgram.programId })
      .rpc();
  }

  async cashOut(roundPda: PublicKey, user: PublicKey, ms: number) {
    return this.program.methods
      .cashOut(new BN(ms))
      .accounts({ round: roundPda, user, systemProgram: SystemProgram.programId })
      .rpc();
  }
}
