import type { FastifyBaseLogger } from 'fastify';
import type WebSocket from 'ws';
import { ApiError, RequestQueue, fetchJsonWithRetry } from './http';

export interface MemeToken {
  address: string;
  symbol: string;
  name: string;
  price: number;
  liquidity: number;
  volume24hUSD: number;
  rank?: number;
  marketCap?: number;
  popularityScore?: number;
}

export interface BirdEyeTrendingParams {
  page?: number;
  limit?: number;
}

export interface BirdEyeListParams {
  page?: number;
  limit?: number;
}

interface BirdEyeClientOptions {
  apiKey: string;
  baseUrl?: string;
  streamUrl?: string;
  logger?: FastifyBaseLogger;
  fetchFn?: typeof fetch;
  queue?: RequestQueue;
  WebSocketCtor?: typeof WebSocket;
}

type NewListingListener = (token: MemeToken) => void;

const DEFAULT_BASE_URL = 'https://public-api.birdeye.so';
const DEFAULT_STREAM_URL = 'wss://public-token-api.birdeye.so/socket';

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const normaliseToken = (raw: any): MemeToken => ({
  address:
    raw?.address ?? raw?.tokenAddress ?? raw?.mint ?? raw?.token_mint ?? raw?.token ?? '',
  symbol: raw?.symbol ?? raw?.tokenSymbol ?? raw?.token_symbol ?? raw?.ticker ?? '',
  name: raw?.name ?? raw?.tokenName ?? raw?.token_name ?? raw?.project ?? '',
  price: toNumber(raw?.price ?? raw?.value ?? raw?.priceUsd ?? raw?.usdPrice ?? raw?.price_usd),
  liquidity: toNumber(
    raw?.liquidity ?? raw?.liquidityUsd ?? raw?.liquidity_usd ?? raw?.totalLiquidity ?? raw?.liquidityUSD
  ),
  volume24hUSD: toNumber(
    raw?.volume24hUSD ??
      raw?.volume24hUsd ??
      raw?.volume24h_usd ??
      raw?.volumeUsd ??
      raw?.volume_24h_usd ??
      raw?.['24h_volume_usd']
  ),
  rank: raw?.rank ?? raw?.order ?? raw?.position,
  marketCap: toNumber(raw?.marketCap ?? raw?.market_cap ?? raw?.marketcap ?? raw?.market_cap_usd),
  popularityScore: toNumber(raw?.popularityScore ?? raw?.popularity_score ?? raw?.score),
});

export class BirdEyeClient {
  private readonly baseUrl: string;
  private readonly streamUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly queue: RequestQueue;
  private readonly logger?: FastifyBaseLogger;
  private readonly WebSocketCtor?: typeof WebSocket;

  private socket?: WebSocket;
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private readonly listeners = new Set<NewListingListener>();
  constructor(private readonly options: BirdEyeClientOptions) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.streamUrl = options.streamUrl ?? DEFAULT_STREAM_URL;
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args));
    this.queue = options.queue ?? new RequestQueue(120);
    this.logger = options.logger;
    this.WebSocketCtor = options.WebSocketCtor;

    if (!this.options.apiKey) {
      throw new Error('BirdEye API key is missing. Set BIRDEYE_API_KEY in the environment.');
    }
  }

  async listTrendingTokens(params: BirdEyeTrendingParams = {}): Promise<MemeToken[]> {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 20);
    const page = Math.max(params.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const url = new URL('/defi/token_trending', this.baseUrl);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    return this.queue.enqueue(async () => {
      const response = await fetchJsonWithRetry<any>(
        this.fetchFn,
        url,
        {
          method: 'GET',
          headers: this.buildHeaders(),
        },
        { logger: this.logger }
      );

      const tokens = Array.isArray(response?.data?.items)
        ? response.data.items
        : Array.isArray(response?.data)
        ? response.data
        : [];

      return tokens.map(normaliseToken);
    });
  }

  async listMemeTokens(params: BirdEyeListParams = {}): Promise<MemeToken[]> {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 20);
    const page = Math.max(params.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const url = new URL('/defi/v3/token/meme/list', this.baseUrl);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    return this.queue.enqueue(async () => {
      const response = await fetchJsonWithRetry<any>(
        this.fetchFn,
        url,
        {
          method: 'GET',
          headers: this.buildHeaders(),
        },
        { logger: this.logger }
      );

      const tokens = Array.isArray(response?.data?.items)
        ? response.data.items
        : Array.isArray(response?.data)
        ? response.data
        : [];

      return tokens.map(normaliseToken);
    });
  }

  async getMemeTokenDetail(address: string): Promise<MemeToken> {
    if (!address) {
      throw new ApiError('Token address is required', 400, undefined, false);
    }

    const url = new URL('/defi/v3/token/meme/detail/single', this.baseUrl);
    url.searchParams.set('address', address);

    return this.queue.enqueue(async () => {
      const response = await fetchJsonWithRetry<any>(
        this.fetchFn,
        url,
        {
          method: 'GET',
          headers: this.buildHeaders(),
        },
        { logger: this.logger }
      );

      const token = response?.data ?? response;
      return normaliseToken(token);
    });
  }

  subscribeToNewListings(listener: NewListingListener): () => void {
    this.listeners.add(listener);
    this.ensureSocket();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.closeSocket();
      }
    };
  }

  async close(): Promise<void> {
    this.listeners.clear();
    this.closeSocket();
  }

  private buildHeaders(): Record<string, string> {
    return {
      'X-API-KEY': this.options.apiKey,
      'x-chain': 'solana',
      'content-type': 'application/json',
    };
  }

  private ensureSocket(): void {
    if (this.socket || !this.WebSocketCtor) {
      if (!this.WebSocketCtor && this.logger) {
        this.logger.warn('WebSocket constructor missing for BirdEye stream; real-time updates disabled');
      }
      return;
    }

    const headers = this.buildHeaders();
    this.socket = new this.WebSocketCtor(this.streamUrl, {
      headers,
    } as any);

    this.socket.on('open', () => {
      this.reconnectAttempts = 0;
      this.socket?.send(
        JSON.stringify({ type: 'SUBSCRIBE_TOKEN_NEW_LISTING', meme_platform_enabled: true })
      );
      this.logger?.info('Subscribed to BirdEye token new listing stream');
    });

    this.socket.on('message', (buffer: WebSocket.RawData) => {
      const payload = buffer.toString();
      this.handleStreamPayload(payload);
    });

    this.socket.on('close', () => {
      this.socket = undefined;
      if (this.listeners.size > 0) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('error', (error) => {
      this.logger?.error({ error }, 'BirdEye stream error');
    });
  }

  private closeSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.socket) {
      try {
        this.socket.terminate();
      } catch (error) {
        this.logger?.warn({ error }, 'Failed to close BirdEye WebSocket');
      }
      this.socket = undefined;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.WebSocketCtor) {
      return;
    }
    this.reconnectAttempts += 1;
    const delayMs = Math.min(30000, 1000 * 2 ** (this.reconnectAttempts - 1));
    this.logger?.warn({ delayMs }, 'Reconnecting to BirdEye stream');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.ensureSocket();
    }, delayMs).unref?.();
  }

  private handleStreamPayload(payload: string): void {
    try {
      const message = JSON.parse(payload);
      const data = message?.data ?? message?.payload ?? message;
      const token = normaliseToken(data);
      if (!token.address) {
        return;
      }
      for (const listener of this.listeners) {
        listener(token);
      }
    } catch (error) {
      this.logger?.warn({ error, payload }, 'Failed to parse BirdEye stream payload');
    }
  }
}
