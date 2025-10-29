import Fastify from 'fastify';
import { beforeAll, afterAll, describe, expect, it, vi, beforeEach } from 'vitest';
import { BirdEyeClient } from '../src/services/birdeye';
import { BitqueryClient } from '../src/services/bitquery';
import { RequestQueue } from '../src/services/http';
import { memecoinRoutes } from '../src/routes/memecoins';

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BirdEyeClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: BirdEyeClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    client = new BirdEyeClient({
      apiKey: 'test-key',
      fetchFn: fetchMock as unknown as typeof fetch,
      queue: new RequestQueue(0),
      logger: logger as any,
    });
  });

  it('parses trending tokens', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          items: [
            {
              address: 'token1',
              symbol: 'AAA',
              name: 'Token AAA',
              price: '1.23',
              liquidityUsd: '1000',
              volume24hUsd: 20000,
              rank: 1,
              marketCap: 500000,
              popularityScore: 87,
            },
          ],
        },
      })
    );

    const tokens = await client.listTrendingTokens({ limit: 5, page: 1 });
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      address: 'token1',
      symbol: 'AAA',
      price: 1.23,
      liquidity: 1000,
      volume24hUSD: 20000,
      rank: 1,
      marketCap: 500000,
      popularityScore: 87,
    });

    const call = fetchMock.mock.calls[0];
    expect(call[0] instanceof URL ? call[0].pathname : call[0]).toContain('/defi/token_trending');
    expect(call[1]?.headers['X-API-KEY']).toBe('test-key');
  });

  it('returns meme token detail', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          address: 'token2',
          symbol: 'BBB',
          name: 'Token BBB',
          price: 0.5,
          liquidityUSD: 2500,
          volume24h_usd: '1200',
        },
      })
    );

    const detail = await client.getMemeTokenDetail('token2');
    expect(detail).toMatchObject({
      address: 'token2',
      symbol: 'BBB',
      price: 0.5,
      liquidity: 2500,
      volume24hUSD: 1200,
    });
  });
});

describe('BitqueryClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: BitqueryClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    client = new BitqueryClient({
      apiKey: 'bit-key',
      fetchFn: fetchMock as unknown as typeof fetch,
      queue: new RequestQueue(0),
      logger: logger as any,
    });
  });

  it('parses token creation events', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          solana: {
            tokenMintEvents: [
              {
                blockTimestamp: '2024-04-01T00:00:00Z',
                mintAccount: 'mint1',
                owner: 'owner1',
                tokenInfo: { name: 'Token One', symbol: 'ONE' },
              },
            ],
          },
        },
      })
    );

    const events = await client.getLatestTokenCreations(5);
    expect(events).toEqual([
      {
        mint: 'mint1',
        owner: 'owner1',
        name: 'Token One',
        symbol: 'ONE',
        time: '2024-04-01T00:00:00Z',
      },
    ]);

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.variables).toMatchObject({ limit: 5 });
  });

  it('parses dex trades', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          solana: {
            dexTrades: [
              {
                blockTimestamp: '2024-04-01T01:00:00Z',
                priceInUsd: '0.12',
                baseAmount: '1000',
                quoteAmount: '120',
                exchangeName: 'Raydium',
                transaction: { signature: 'sig123' },
              },
            ],
          },
        },
      })
    );

    const trades = await client.getRecentDexTrades('token1', { limit: 1 });
    expect(trades).toEqual([
      {
        time: '2024-04-01T01:00:00Z',
        price: 0.12,
        baseAmount: 1000,
        quoteAmount: 120,
        exchange: 'Raydium',
        transactionSignature: 'sig123',
      },
    ]);

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.variables).toMatchObject({ token: 'token1', exchange: 'Raydium' });
  });
});

describe('memecoin routes', () => {
  const app = Fastify();
  const memecoinService = {
    getTrendingTokens: vi.fn().mockResolvedValue([{ address: 'token1' }]),
    getMemeTokenList: vi.fn().mockResolvedValue([{ address: 'token2' }]),
    getMemeTokenDetail: vi.fn().mockResolvedValue({ address: 'token3' }),
    getRecentTrades: vi.fn().mockResolvedValue([{ time: 'now' }]),
    onNewListing: vi.fn().mockReturnValue(() => {}),
  };

  beforeAll(async () => {
    // @ts-expect-error Fastify decorate typing
    app.decorate('memecoins', memecoinService);
    await app.register(memecoinRoutes, { prefix: '/api' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns trending tokens', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/memecoins/trending' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ address: 'token1' }]);
    expect(memecoinService.getTrendingTokens).toHaveBeenCalledWith({ page: undefined, limit: undefined });
  });

  it('returns meme token list', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/memecoins/list?page=2&limit=10' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ address: 'token2' }]);
    expect(memecoinService.getMemeTokenList).toHaveBeenCalledWith({ page: 2, limit: 10 });
  });

  it('returns meme token detail', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/memecoins/token3/detail' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ address: 'token3' });
    expect(memecoinService.getMemeTokenDetail).toHaveBeenCalledWith('token3');
  });

  it('returns meme token trades', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/memecoins/token4/trades?limit=5&exchange=Orca' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ time: 'now' }]);
    expect(memecoinService.getRecentTrades).toHaveBeenCalledWith('token4', { limit: 5, exchange: 'Orca' });
  });
});
