import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

export const verifySolanaSignature = (message: Uint8Array, signature: Uint8Array, publicKey: PublicKey) => {
  return nacl.sign.detached.verify(message, signature, publicKey.toBytes());
};
