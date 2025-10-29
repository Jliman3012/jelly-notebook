import { config as loadEnv } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const resolveEnvFile = () => {
  const defaultFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
  const candidate = path.resolve(process.cwd(), defaultFile);
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return undefined;
};

const envPath = resolveEnvFile();
if (envPath) {
  loadEnv({ path: envPath });
} else {
  loadEnv();
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.string().default('info'),
  RPC_URL: z.string().default('https://api.devnet.solana.com'),
  RPC_URL_FALLBACK: z.string().optional(),
  NEXT_PUBLIC_RPC_URL: z.string().default('https://api.devnet.solana.com'),
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4000'),
  NEXT_PUBLIC_WS_URL: z.string().default('ws://localhost:4000/round'),
  PRICE_MODE: z.enum(['SIM', 'LIVE']).default('SIM'),
  SUPABASE_URL: z.string().default('http://localhost:54321'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/memecrash'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PLAY_MINT: z.string().default(''),
  HOUSE_MINT: z.string().optional(),
  SWITCHBOARD_VRF_QUEUE: z.string().optional(),
  SWITCHBOARD_VRF_KEYPAIR_JSON: z.string().optional(),
  ALCHEMY_OR_HELIUS_API_KEY: z.string().optional(),
  DEX_API_KEYS_JSON: z.string().optional(),
  GEO_BLOCK_LIST: z.string().optional(),
  ADMIN_BEARER_TOKEN: z.string().default('dev-admin'),
  NEXT_PUBLIC_ADMIN_TOKEN: z.string().optional(),
});

const parsed = schema.parse(process.env);

const dexApiKeys = (() => {
  if (!parsed.DEX_API_KEYS_JSON || parsed.DEX_API_KEYS_JSON.trim().length === 0) {
    return {} as Record<string, string>;
  }
  try {
    return z
      .record(z.string())
      .parse(JSON.parse(parsed.DEX_API_KEYS_JSON)) as Record<string, string>;
  } catch (error) {
    throw new Error('DEX_API_KEYS_JSON must be valid JSON, e.g. {"birdeye":""}.');
  }
})();

const geoBlockList = parsed.GEO_BLOCK_LIST
  ? parsed.GEO_BLOCK_LIST.split(',').map((code) => code.trim()).filter(Boolean)
  : [];

export type PriceMode = z.infer<typeof schema>['PRICE_MODE'];

export interface AppConfig {
  env: z.infer<typeof schema>['NODE_ENV'];
  server: { port: number };
  logging: { level: string };
  rpc: { primary: string; fallback?: string };
  priceMode: PriceMode;
  supabase: { url: string; serviceRoleKey?: string };
  database: { url: string };
  redis: { url: string };
  tokens: { playMint: string; houseMint?: string };
  switchboard: { vrfQueue?: string; vrfKeypairJson?: string };
  admin: { bearerToken: string; publicToken?: string };
  public: { apiUrl: string; wsUrl: string; rpcUrl: string };
  compliance: { geoBlockList: string[] };
  external: { alchemyOrHeliusApiKey?: string; dexApiKeys: Record<string, string> };
}

export const config: AppConfig = {
  env: parsed.NODE_ENV,
  server: { port: parsed.PORT },
  logging: { level: parsed.LOG_LEVEL },
  rpc: {
    primary: parsed.RPC_URL,
    fallback: parsed.RPC_URL_FALLBACK?.trim() ? parsed.RPC_URL_FALLBACK : undefined,
  },
  priceMode: parsed.PRICE_MODE,
  supabase: {
    url: parsed.SUPABASE_URL,
    serviceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY?.trim() ? parsed.SUPABASE_SERVICE_ROLE_KEY : undefined,
  },
  database: { url: parsed.DATABASE_URL },
  redis: { url: parsed.REDIS_URL },
  tokens: {
    playMint: parsed.PLAY_MINT,
    houseMint: parsed.HOUSE_MINT?.trim() ? parsed.HOUSE_MINT : undefined,
  },
  switchboard: {
    vrfQueue: parsed.SWITCHBOARD_VRF_QUEUE?.trim() ? parsed.SWITCHBOARD_VRF_QUEUE : undefined,
    vrfKeypairJson: parsed.SWITCHBOARD_VRF_KEYPAIR_JSON?.trim()
      ? parsed.SWITCHBOARD_VRF_KEYPAIR_JSON
      : undefined,
  },
  admin: {
    bearerToken: parsed.ADMIN_BEARER_TOKEN,
    publicToken: parsed.NEXT_PUBLIC_ADMIN_TOKEN?.trim() ? parsed.NEXT_PUBLIC_ADMIN_TOKEN : undefined,
  },
  public: {
    apiUrl: parsed.NEXT_PUBLIC_API_URL,
    wsUrl: parsed.NEXT_PUBLIC_WS_URL,
    rpcUrl: parsed.NEXT_PUBLIC_RPC_URL,
  },
  compliance: { geoBlockList },
  external: {
    alchemyOrHeliusApiKey: parsed.ALCHEMY_OR_HELIUS_API_KEY?.trim()
      ? parsed.ALCHEMY_OR_HELIUS_API_KEY
      : undefined,
    dexApiKeys,
  },
};
