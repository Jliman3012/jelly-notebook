import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://user:pass@localhost:5432/memecrash'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  RPC_URL: z.string().default('https://api.devnet.solana.com'),
  RPC_URL_FALLBACK: z.string().optional(),
  SUPABASE_URL: z.string().default('http://localhost:54321'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('service-role-key'),
  GEO_BLOCK_LIST: z.string().optional(),
  ADMIN_BEARER_TOKEN: z.string().default('dev-admin'),
});

const parsed = schema.parse(process.env);

export const config = {
  env: parsed.NODE_ENV,
  port: parsed.PORT,
  databaseUrl: parsed.DATABASE_URL,
  redisUrl: parsed.REDIS_URL,
  rpcUrl: parsed.RPC_URL,
  rpcUrlFallback: parsed.RPC_URL_FALLBACK,
  supabase: {
    url: parsed.SUPABASE_URL,
    serviceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
  },
  geoBlockList: parsed.GEO_BLOCK_LIST?.split(',').map((code) => code.trim()).filter(Boolean) ?? [],
  adminBearerToken: parsed.ADMIN_BEARER_TOKEN,
};
