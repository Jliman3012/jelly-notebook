declare module 'tweetnacl' {
  interface BoxKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  interface SignKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  interface DetachedSignature {
    (message: Uint8Array, secretKey: Uint8Array): Uint8Array;
    verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
  }

  interface Sign {
    (message: Uint8Array, secretKey: Uint8Array): Uint8Array;
    detached: DetachedSignature;
    open(message: Uint8Array, secretKey: Uint8Array): Uint8Array | null;
    keyPair: (() => SignKeyPair) & {
      fromSeed(seed: Uint8Array): SignKeyPair;
    };
  }

  interface Box {
    (message: Uint8Array, nonce: Uint8Array, publicKey: Uint8Array, secretKey: Uint8Array): Uint8Array;
    open(
      message: Uint8Array,
      nonce: Uint8Array,
      publicKey: Uint8Array,
      secretKey: Uint8Array
    ): Uint8Array | null;
    before(publicKey: Uint8Array, secretKey: Uint8Array): Uint8Array;
    after(message: Uint8Array, nonce: Uint8Array, sharedKey: Uint8Array): Uint8Array;
    open: {
      (
        message: Uint8Array,
        nonce: Uint8Array,
        publicKey: Uint8Array,
        secretKey: Uint8Array
      ): Uint8Array | null;
      after(message: Uint8Array, nonce: Uint8Array, sharedKey: Uint8Array): Uint8Array | null;
    };
    keyPair: (() => BoxKeyPair) & {
      fromSecretKey(secretKey: Uint8Array): BoxKeyPair;
    };
  }

  interface SecretBox {
    (message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
    open(message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null;
  }

  interface ScalarMult {
    (n: Uint8Array, p: Uint8Array): Uint8Array;
    base(n: Uint8Array): Uint8Array;
  }

  const randomBytes: (length: number) => Uint8Array;
  const secretbox: SecretBox;
  const box: Box;
  const sign: Sign;
  const scalarMult: ScalarMult;
  const hash: (message: Uint8Array) => Uint8Array;
  const verify: (x: Uint8Array, y: Uint8Array) => boolean;
  const setPRNG: (fn: (arr: Uint8Array, len: number) => void) => void;
  const ready: Promise<void>;

  const nacl: {
    randomBytes: typeof randomBytes;
    secretbox: typeof secretbox;
    box: typeof box;
    sign: typeof sign;
    scalarMult: typeof scalarMult;
    hash: typeof hash;
    verify: typeof verify;
    setPRNG: typeof setPRNG;
    ready: typeof ready;
  };

  export { randomBytes, secretbox, box, sign, scalarMult, hash, verify, setPRNG, ready };
  export default nacl;
}
