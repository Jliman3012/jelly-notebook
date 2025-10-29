import { getConfig } from '@memecrash/sdk/config';

const baseConfig = getConfig();

if (!baseConfig.adminBearerToken) {
  throw new Error('ADMIN_BEARER_TOKEN is required. Set it in your environment configuration.');
}

export const config = {
  env: baseConfig.env,
  port: baseConfig.port,
  databaseUrl: baseConfig.databaseUrl,
  redisUrl: baseConfig.redisUrl,
  rpcUrl: baseConfig.rpcUrl,
  rpcUrlFallback: baseConfig.rpcUrlFallback,
  supabase: baseConfig.supabase,
  geoBlockList: baseConfig.geoBlockList,
  adminBearerToken: baseConfig.adminBearerToken,
};
