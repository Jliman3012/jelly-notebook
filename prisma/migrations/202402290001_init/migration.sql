CREATE TYPE "RoundStatus" AS ENUM ('PENDING', 'LOCKED', 'RUNNING', 'CRASHED', 'SETTLED', 'CANCELED');

CREATE TABLE "Token" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "mint" TEXT NOT NULL UNIQUE,
    "symbol" TEXT,
    "name" TEXT,
    "logoUrl" TEXT,
    "liquidityUSD" DOUBLE PRECISION NOT NULL,
    "fdvUSD" DOUBLE PRECISION,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowlisted" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Round" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "roundNo" INTEGER NOT NULL UNIQUE,
    "tokenMint" TEXT NOT NULL REFERENCES "Token"("mint"),
    "status" "RoundStatus" NOT NULL,
    "vrfRequest" TEXT,
    "vrfResult" TEXT,
    "commitHash" TEXT,
    "startAt" TIMESTAMPTZ,
    "lockAt" TIMESTAMPTZ,
    "endAt" TIMESTAMPTZ,
    "rulesetVersion" TEXT NOT NULL,
    "pathCdnUrl" TEXT,
    "basePrice" DOUBLE PRECISION,
    "crashAtMs" INTEGER,
    "maxMultiplier" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Bet" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "roundId" TEXT NOT NULL REFERENCES "Round"("id") ON DELETE CASCADE,
    "userId" TEXT,
    "wallet" TEXT NOT NULL,
    "stakeLamports" BIGINT NOT NULL,
    "cashedOut" BOOLEAN NOT NULL DEFAULT FALSE,
    "cashOutMs" INTEGER,
    "payoutLamports" BIGINT,
    "txPlace" TEXT,
    "txCashOut" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "Round_tokenMint_idx" ON "Round"("tokenMint");
CREATE INDEX "Bet_roundId_idx" ON "Bet"("roundId");
