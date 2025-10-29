✨ Additional Codex Prompt – Environment & Config Tasks

Below is a self-contained prompt you can feed into Codex (or any AI code generator) to scaffold environment configuration for the memecrash monorepo. This extends the core prompt you’ve already written by detailing how to set up and use environment variables for development and production.

🗂️ Environment Files & Values

Create three environment files at the root of your monorepo:

.env.development – defaults for local dev on Solana devnet. Use the provided values:

RPC_URL=https://api.devnet.solana.com

NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

PRICE_MODE=SIM

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/memecrash

REDIS_URL=redis://localhost:6379

PLAY_MINT=PLAY111111111111111111111111111111111111 (replace with a devnet mint you own)

Leave HOUSE_MINT empty to default to USDC

Leave VRF keys empty (they’re unused in SIM mode)

Use ADMIN_BEARER_TOKEN=dev-admin and NEXT_PUBLIC_ADMIN_TOKEN=dev-admin for local admin routes

Set NEXT_PUBLIC_API_URL=http://localhost:4000 and NEXT_PUBLIC_WS_URL=ws://localhost:4000/round

.env.production – for mainnet deployment. Only include keys that are safe for server environments (never commit secrets). Use blank placeholders for secrets like SUPABASE_SERVICE_ROLE_KEY, SWITCHBOARD_VRF_KEYPAIR_JSON, etc. Set PRICE_MODE=LIVE, and point all RPC endpoints to https://api.mainnet-beta.solana.com. Remove NEXT_PUBLIC_ADMIN_TOKEN in production.

.env.example – a template showing all available keys with empty values. This file should be committed so other developers know which environment variables are required.

Documentation – Add comments to each .env.* file explaining what each key does, which ones should be kept secret, and how to obtain values (e.g., how to create a devnet PLAY mint). Make sure the comments start with # so that the values are not parsed by dotenv.

Do not hardcode secrets – Environment files must be excluded from version control (.gitignore) except for .env.example. The real .env.development and .env.production should be set up via your deployment platform or local .env files.

⚙️ Code Integration

Use dotenv – In Node.js/Express/Fastify services (e.g., apps/api, apps/ingestor) import and configure dotenv to load environment variables:

import * as dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development' });


Centralize configuration – Create a file packages/sdk/src/config.ts or similar that exports a strongly typed Config object. It should read values from process.env and apply sensible defaults. For example:

export const config = {
  rpcUrl: process.env.RPC_URL ?? 'https://api.devnet.solana.com',
  playMint: process.env.PLAY_MINT ?? '',
  priceMode: (process.env.PRICE_MODE ?? 'SIM') as 'SIM' | 'LIVE',
  geoBlockList: (process.env.GEO_BLOCK_LIST ?? '').split(',').filter(Boolean),
  // ...other keys
};


Expose public variables – For the Next.js app (apps/web), any variable prefaced with NEXT_PUBLIC_ is automatically exposed. Import environment variables as process.env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_WS_URL, etc. Do not import private keys (like SUPABASE_SERVICE_ROLE_KEY) in client code.

Cluster selection – In the SDK and Anchor program scripts, read rpcUrl from config to determine the Solana cluster. Provide helpful error messages if the environment variables are misconfigured.

Add .gitignore entries – Ensure .env.development and .env.production are included in .gitignore to prevent accidental commits of secrets.

✅ Acceptance

Your generated code should:

Include the three .env files described above with comments and placeholders.

Provide a type-safe config module that reads environment variables and defaults sensibly.

Show how to integrate the configuration into the API server and ingestor (loading dotenv early) and into the front-end (via NEXT_PUBLIC_ variables).

Document how to set up the environment (e.g., run cp .env.example .env.development, then fill in the values), and note that secrets should be provided outside of version control in production.

🛠️ Execution Tips for Codex

When generating code:

Respect the existing monorepo structure (apps/web, apps/api, apps/ingestor, packages/sdk, programs/memecrash).

Use modern TypeScript conventions (ES modules, top-level async functions where necessary).

Provide comments explaining why each environment variable exists and how to override it.

Ensure no secret values appear in committed files. Use placeholders instead.

Once you implement these tasks, you will have a robust environment configuration system that seamlessly switches between devnet simulation and mainnet live mode, and your code can reference configuration values without duplication.
