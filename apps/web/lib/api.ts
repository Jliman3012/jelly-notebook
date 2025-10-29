export interface ApiConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

const defaultConfig: ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
};

export async function apiGet<T>(path: string, config: ApiConfig = defaultConfig): Promise<T> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(config.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }
  return response.json() as Promise<T>;
}

export interface TokenDto {
  mint: string;
  symbol: string;
  name: string;
  logoUrl?: string | null;
  liquidityUSD: number;
}

export interface RoundDto {
  id: string;
  roundNo: number;
  token: TokenDto;
  status: string;
  basePrice: number;
  maxMultiplier: number | null;
  crashAtMs: number | null;
  startAt: string | null;
  lockAt: string | null;
  endAt: string | null;
}

export const fetchCurrentRound = () => apiGet<RoundDto>('/rounds/current');
export const fetchTokens = () => apiGet<TokenDto[]>('/tokens?allowlisted=1');
