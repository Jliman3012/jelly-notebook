# MemeCrash Monorepo

MemeCrash is a provably-fair crash-style game that streams live volatility from
on-chain Solana memecoins. This monorepo ships a production ready stack built
with Turborepo, Anchor, Fastify, Prisma, and Next.js.

## Repository Layout

```
apps/
  api/        # Fastify REST + WS backend, Prisma, BullMQ
  ingestor/   # Token discovery, tick ingestion, multiplier path builder
  web/        # Next.js 14 App Router front-end with shadcn/ui
packages/
  sdk/        # Shared TypeScript client + deterministic utilities
programs/
  memecrash/  # Solana Anchor program that escrows bets & settles rounds
scripts/      # Developer tooling & seeds
prisma/       # Shared Prisma schema & migrations
```

## Quick Start

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Copy environment template**

   ```bash
   cp .env.example .env
   ```

   Populate the values with your RPC endpoints, Supabase credentials, and
   Switchboard VRF keypair. For local development you can use the provided
   mock secrets.

3. **Start the stack**

   ```bash
   pnpm dev
   ```

   The dev script launches:

   - Anchor local validator with the memecrash program
   - Ingestor service in mock price mode (`PRICE_MODE=SIM`)
   - API server with REST and WebSocket endpoints
   - Next.js front-end at `http://localhost:3000`

4. **Seed demo data**

   ```bash
   pnpm --filter scripts dev-seed
   ```

   Seeds allowlisted tokens and simulated rounds so you can play immediately.

## Verify Provable Fairness

1. Play a round in PLAY mode (faucet tokens).
2. Navigate to `/verify/<roundNo>`.
3. The page downloads the stored VRF seed, multiplier parameters, and tick
   history and recomputes the crash curve entirely client-side. Green means the
   recomputation matched on-chain settlement.

## Testing

```bash
pnpm lint
pnpm test
```

- Anchor unit tests run against a local validator.
- API and SDK have Jest unit suites.
- Playwright E2E test simulates a player placing a bet and cashing out before
  crash in mock mode.

## Deployment Notes

- Update `.env` with production RPCs, Supabase, Redis, and Switchboard
  credentials.
- Deploy the Anchor program via `anchor deploy` and record the program ID in the
  API `config.ts` and SDK constants.
- Use Supabase or a managed Postgres database. Run Prisma migrations with
  `pnpm --filter apps/api prisma migrate deploy`.
- Configure a Redis instance compatible with BullMQ (e.g., Upstash or ElastiCache).
- Ensure your VRF queue has sufficient funds and authority delegated to the
  API service keypair.

## Security Checklist

- ✅ Program invariants enforce escrowed SPL transfers and prevent reentrancy.
- ✅ All randomness originates from Switchboard VRF with commit-reveal.
- ✅ Admin routes are bearer protected and double checked with multisig keys.
- ✅ Web app displays risk warnings, geo compliance, and passkey gated access.
- ✅ Mock mode never performs real transfers and uses in-memory tokens.

For additional documentation refer to comments inside each package.
