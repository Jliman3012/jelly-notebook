import * as dotenv from 'dotenv';

export type NodeEnvironment = 'development' | 'test' | 'production';
export type PriceMode = 'SIM' | 'LIVE';
export type Cluster = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet' | 'custom';

export interface Config {
  env: NodeEnvironment;
  port: number;
  priceMode: PriceMode;
  rpcUrl: string;
  rpcUrlFallback?: string;
  cluster: Cluster;
  playMint: string;
  houseMint: string;
  databaseUrl: string;
  redisUrl: string;
  supabase: {
    url?: string;
    serviceRoleKey?: string;
  };
  switchboard: {
    vrfQueue?: string;
    vrfKeypairJson?: string;
  };
  geoBlockList: string[];
  adminBearerToken?: string;
  externalApis: {
    alchemyOrHeliusApiKey?: string;
    dexApiKeys: Record<string, string>;
  };
  public: {
    apiUrl?: string;
    wsUrl?: string;
    rpcUrl?: string;
    adminToken?: string;
  };
  apiUrl?: string;
  wsUrl?: string;
}

let environmentLoaded = false;
let cachedConfig: Config | null = null;

export interface LoadEnvironmentOptions {
  /**
   * Custom path to a dotenv file. By default we infer the file from NODE_ENV.
   */
  path?: string;
}

/**
 * Loads environment variables from the appropriate dotenv file. Subsequent calls are no-ops.
 */
export function loadEnvironment(options: LoadEnvironmentOptions = {}): void {
  if (environmentLoaded) {
    return;
  }

  const inferredPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
  const envPath = options.path ?? inferredPath;
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    const message = `[config] Unable to load environment file at "${envPath}" (${result.error.message}).`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${message} Ensure your deployment injects the required secrets.`);
    }
    // eslint-disable-next-line no-console
    console.warn(`${message} Falling back to process.env only.`);
  }

  environmentLoaded = true;
}

/**
 * Computes the strongly typed configuration used throughout the monorepo. Values are cached so
 * repeated calls are cheap.
 */
export function getConfig(): Config {
  if (!environmentLoaded) {
    loadEnvironment();
  }

  if (cachedConfig) {
    return cachedConfig;
  }

  const env = (process.env.NODE_ENV ?? 'development') as NodeEnvironment;
  const port = parsePort(process.env.PORT, env === 'development' ? 4000 : undefined);
  const rpcUrl = process.env.RPC_URL ?? defaultRpcForEnv(env);
  const rpcUrlFallback = emptyToUndefined(process.env.RPC_URL_FALLBACK);
  const priceMode = parsePriceMode(process.env.PRICE_MODE);
  const cluster = inferCluster(rpcUrl);

  if (priceMode === 'LIVE' && cluster !== 'mainnet-beta') {
    throw new Error(
      `[config] PRICE_MODE=LIVE requires RPC_URL to point at mainnet-beta. Received "${rpcUrl}".`
    );
  }

  const geoBlockList = splitList(process.env.GEO_BLOCK_LIST);
  const dexApiKeys = parseDexApiKeys(process.env.DEX_API_KEYS_JSON);
  const defaultApiUrl = env === 'development' ? 'http://localhost:4000' : undefined;
  const defaultWsUrl = env === 'development' ? 'ws://localhost:4000/round' : undefined;
  const nextPublicApiUrl = emptyToUndefined(process.env.NEXT_PUBLIC_API_URL) ?? defaultApiUrl;
  const nextPublicWsUrl = emptyToUndefined(process.env.NEXT_PUBLIC_WS_URL) ?? defaultWsUrl;
  const nextPublicRpcUrl = emptyToUndefined(process.env.NEXT_PUBLIC_RPC_URL);
  const nextPublicAdminToken = emptyToUndefined(process.env.NEXT_PUBLIC_ADMIN_TOKEN);

  cachedConfig = {
    env,
    port,
    priceMode,
    rpcUrl,
    rpcUrlFallback,
    cluster,
    playMint: process.env.PLAY_MINT ?? '',
    houseMint: process.env.HOUSE_MINT ?? '',
    databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/memecrash',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    supabase: {
      url: emptyToUndefined(process.env.SUPABASE_URL),
      serviceRoleKey: emptyToUndefined(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    switchboard: {
      vrfQueue: emptyToUndefined(process.env.SWITCHBOARD_VRF_QUEUE),
      vrfKeypairJson: emptyToUndefined(process.env.SWITCHBOARD_VRF_KEYPAIR_JSON),
    },
    geoBlockList,
    adminBearerToken:
      emptyToUndefined(process.env.ADMIN_BEARER_TOKEN) ?? (env === 'development' ? 'dev-admin' : undefined),
    externalApis: {
      alchemyOrHeliusApiKey: emptyToUndefined(process.env.ALCHEMY_OR_HELIUS_API_KEY),
      dexApiKeys,
    },
    public: {
      apiUrl: nextPublicApiUrl,
      wsUrl: nextPublicWsUrl,
      rpcUrl: nextPublicRpcUrl ?? rpcUrl,
      adminToken: nextPublicAdminToken ?? (env === 'development' ? 'dev-admin' : undefined),
    },
    apiUrl: emptyToUndefined(process.env.API_URL) ?? nextPublicApiUrl,
    wsUrl: emptyToUndefined(process.env.WS_URL) ?? nextPublicWsUrl,
  };

  return cachedConfig;
}

function defaultRpcForEnv(env: NodeEnvironment): string {
  return env === 'production' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com';
}

function parsePort(value: string | undefined, fallback?: number): number {
  if (!value) {
    if (typeof fallback === 'number') {
      return fallback;
    }
    return 4000;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`[config] PORT must be a number. Received "${value}".`);
  }
  return parsed;
}

function parsePriceMode(value: string | undefined): PriceMode {
  if (value === 'LIVE') {
    return 'LIVE';
  }
  if (value === 'SIM' || value === undefined || value === '') {
    return 'SIM';
  }
  throw new Error(`[config] PRICE_MODE must be either "SIM" or "LIVE". Received "${value}".`);
}

function inferCluster(url: string): Cluster {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('devnet')) {
      return 'devnet';
    }
    if (parsed.hostname.includes('testnet')) {
      return 'testnet';
    }
    if (parsed.hostname.includes('mainnet')) {
      return 'mainnet-beta';
    }
    if (parsed.hostname.includes('localhost') || parsed.hostname.includes('127.0.0.1')) {
      return 'localnet';
    }
    return 'custom';
  } catch (error) {
    throw new Error(`[config] RPC_URL must be a valid URL. Received "${url}".`);
  }
}

function splitList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseDexApiKeys(value: string | undefined): Record<string, string> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([_, keyValue]) => typeof keyValue === 'string' && keyValue.length > 0)
    );
  } catch (error) {
    throw new Error('[config] DEX_API_KEYS_JSON must be valid JSON, e.g. {"birdeye":"token"}.');
  }
}

function emptyToUndefined(value: string | undefined | null): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Resets the cached configuration. Primarily useful in tests.
 */
export function resetConfigCache(): void {
  cachedConfig = null;
  environmentLoaded = false;
}
