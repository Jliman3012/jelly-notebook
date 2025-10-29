import type { FastifyBaseLogger } from 'fastify';
import { RequestQueue, fetchJsonWithRetry } from './http';

export interface TokenCreationEvent {
  mint: string;
  name?: string;
  symbol?: string;
  owner?: string;
  time: string;
}

export interface DexTrade {
  time: string;
  price: number;
  baseAmount: number;
  quoteAmount: number;
  exchange?: string;
  transactionSignature?: string;
}

interface BitqueryClientOptions {
  apiKey: string;
  baseUrl?: string;
  logger?: FastifyBaseLogger;
  fetchFn?: typeof fetch;
  queue?: RequestQueue;
}

const DEFAULT_BASE_URL = 'https://graphql.bitquery.io';

export class BitqueryClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly queue: RequestQueue;
  private readonly logger?: FastifyBaseLogger;

  constructor(private readonly options: BitqueryClientOptions) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args));
    this.queue = options.queue ?? new RequestQueue(150);
    this.logger = options.logger;

    if (!this.options.apiKey) {
      throw new Error('Bitquery API key is missing. Set BITQUERY_API_KEY in the environment.');
    }
  }

  async getLatestTokenCreations(limit: number): Promise<TokenCreationEvent[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));

    const query = `
      query TokenMintEvents($limit: Int!) {
        solana(network: solana) {
          tokenMintEvents(orderBy: { descending: blockTimestamp }, limit: $limit) {
            blockTimestamp
            mintAccount
            owner
            tokenInfo {
              name
              symbol
            }
          }
        }
      }
    `;

    const response = await this.executeGraphql<{ solana: { tokenMintEvents: any[] } }>(query, {
      limit: safeLimit,
    });

    const events = response?.solana?.tokenMintEvents ?? [];
    return events.map((event) => ({
      mint: event?.mintAccount ?? event?.mint ?? '',
      owner: event?.owner ?? event?.ownerAccount,
      name: event?.tokenInfo?.name ?? event?.name,
      symbol: event?.tokenInfo?.symbol ?? event?.symbol,
      time: event?.blockTimestamp ?? event?.time ?? '',
    }));
  }

  async getRecentDexTrades(
    tokenAddress: string,
    options: { limit?: number; exchange?: string } = {}
  ): Promise<DexTrade[]> {
    const safeLimit = Math.max(1, Math.min(options.limit ?? 20, 200));
    const exchange = options.exchange ?? 'Raydium';

    const query = `
      query RecentDexTrades($token: String!, $limit: Int!, $exchange: String!) {
        solana(network: solana) {
          dexTrades(
            limit: { count: $limit }
            orderBy: { descending: blockTimestamp }
            baseCurrency: { is: $token }
            exchangeName: { is: $exchange }
          ) {
            blockTimestamp
            priceInUsd
            baseAmount
            quoteAmount
            exchangeName
            transaction {
              signature
            }
          }
        }
      }
    `;

    const response = await this.executeGraphql<{ solana: { dexTrades: any[] } }>(query, {
      token: tokenAddress,
      limit: safeLimit,
      exchange,
    });

    const trades = response?.solana?.dexTrades ?? [];
    return trades.map((trade) => ({
      time: trade?.blockTimestamp ?? trade?.time ?? '',
      price: Number(trade?.priceInUsd ?? trade?.price ?? 0),
      baseAmount: Number(trade?.baseAmount ?? 0),
      quoteAmount: Number(trade?.quoteAmount ?? 0),
      exchange: trade?.exchangeName ?? exchange,
      transactionSignature: trade?.transaction?.signature ?? trade?.signature,
    }));
  }

  private async executeGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const body = JSON.stringify({ query, variables });

    const response = await this.queue.enqueue(() =>
      fetchJsonWithRetry<{ data?: T; errors?: unknown[] }>(
        this.fetchFn,
        this.baseUrl,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'X-API-KEY': this.options.apiKey,
          },
          body,
        },
        { logger: this.logger }
      )
    );

    if (response.errors && response.errors.length > 0) {
      throw new Error(`Bitquery error: ${JSON.stringify(response.errors)}`);
    }

    if (!response.data) {
      throw new Error('Bitquery response missing data');
    }

    return response.data;
  }
}
