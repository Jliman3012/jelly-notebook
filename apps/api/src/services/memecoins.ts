import type { FastifyBaseLogger } from 'fastify';
import { EventEmitter } from 'node:events';
import { BirdEyeClient, MemeToken } from './birdeye';
import { BitqueryClient, DexTrade, TokenCreationEvent } from './bitquery';
import { RequestQueue } from './http';
import type WebSocket from 'ws';

export interface MemecoinServiceOptions {
  birdeyeApiKey: string;
  bitqueryApiKey: string;
  logger: FastifyBaseLogger;
  fetchFn?: typeof fetch;
  birdEyeBaseUrl?: string;
  bitqueryBaseUrl?: string;
  birdEyeStreamUrl?: string;
  WebSocketCtor?: typeof WebSocket;
}

export class MemecoinService {
  private readonly birdEyeClient: BirdEyeClient;
  private readonly bitqueryClient: BitqueryClient;
  private readonly events = new EventEmitter();
  private started = false;
  private unsubscribe?: () => void;

  constructor(private readonly options: MemecoinServiceOptions) {
    if (!options.birdeyeApiKey) {
      throw new Error('BirdEye API key is missing. Set BIRDEYE_API_KEY in the environment.');
    }
    if (!options.bitqueryApiKey) {
      throw new Error('Bitquery API key is missing. Set BITQUERY_API_KEY in the environment.');
    }

    const birdEyeQueue = new RequestQueue(120);
    const bitqueryQueue = new RequestQueue(150);

    this.birdEyeClient = new BirdEyeClient({
      apiKey: options.birdeyeApiKey,
      baseUrl: options.birdEyeBaseUrl,
      streamUrl: options.birdEyeStreamUrl,
      logger: options.logger,
      fetchFn: options.fetchFn,
      queue: birdEyeQueue,
      WebSocketCtor: options.WebSocketCtor,
    });

    this.bitqueryClient = new BitqueryClient({
      apiKey: options.bitqueryApiKey,
      baseUrl: options.bitqueryBaseUrl,
      logger: options.logger,
      fetchFn: options.fetchFn,
      queue: bitqueryQueue,
    });
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.unsubscribe = this.birdEyeClient.subscribeToNewListings((token) => {
      this.options.logger.info({ token }, 'New meme token listing detected');
      this.events.emit('newListing', token);
    });
  }

  async stop(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    await this.birdEyeClient.close();
    this.started = false;
  }

  onNewListing(listener: (token: MemeToken) => void): () => void {
    this.events.on('newListing', listener);
    return () => this.events.off('newListing', listener);
  }

  async getTrendingTokens(params?: { page?: number; limit?: number }): Promise<MemeToken[]> {
    return this.birdEyeClient.listTrendingTokens(params);
  }

  async getMemeTokenList(params?: { page?: number; limit?: number }): Promise<MemeToken[]> {
    return this.birdEyeClient.listMemeTokens(params);
  }

  async getMemeTokenDetail(address: string): Promise<MemeToken> {
    return this.birdEyeClient.getMemeTokenDetail(address);
  }

  async getRecentTokenCreations(limit: number): Promise<TokenCreationEvent[]> {
    return this.bitqueryClient.getLatestTokenCreations(limit);
  }

  async getRecentTrades(
    address: string,
    options?: { limit?: number; exchange?: string }
  ): Promise<DexTrade[]> {
    return this.bitqueryClient.getRecentDexTrades(address, options);
  }
}
