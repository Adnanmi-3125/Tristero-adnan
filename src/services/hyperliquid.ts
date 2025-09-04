import {
  HyperliquidMetaResponse,
  HyperliquidPricesResponse,
  HyperliquidCandleResponse,
  CryptoAsset,
  CandleData,
  ApiError
} from '@/types/trading';

const API_URL = import.meta.env.VITE_HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz/info';

// Error handling utility
class HyperliquidAPIError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = 'HyperliquidAPIError';
  }
}

// Base API request function with error handling
async function apiRequest<T>(payload: Record<string, any>): Promise<T> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new HyperliquidAPIError(
        `API request failed: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof HyperliquidAPIError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new HyperliquidAPIError('Network error: Unable to connect to API');
    }

    throw new HyperliquidAPIError(
      error instanceof Error ? error.message : 'Unknown API error'
    );
  }
}

/**
 * Get market metadata including all available assets
 */
export async function getMarketMeta(): Promise<HyperliquidMetaResponse> {
  return apiRequest<HyperliquidMetaResponse>({
    type: 'meta'
  });
}

/**
 * Get current prices for all assets
 */
export async function getAllMids(): Promise<HyperliquidPricesResponse> {
  return apiRequest<HyperliquidPricesResponse>({
    type: 'allMids'
  });
}

/**
 * Get historical candlestick data for a specific asset
 */
export async function getCandleSnapshot(
  coin: string,
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' = '1h',
  startTime?: number
): Promise<HyperliquidCandleResponse> {
  const payload: any = {
    type: 'candleSnapshot',
    req: {
      coin,
      interval,
    }
  };

  if (startTime) {
    payload.req.startTime = startTime;
  }

  return apiRequest<HyperliquidCandleResponse>(payload);
}

/**
 * Transform raw price data into CryptoAsset objects
 */
export function transformPriceData(
  pricesData: HyperliquidPricesResponse,
  metaData: HyperliquidMetaResponse,
  previousPrices?: HyperliquidPricesResponse
): CryptoAsset[] {
  const assets: CryptoAsset[] = [];

  for (const [symbol, priceStr] of Object.entries(pricesData)) {
    const price = parseFloat(priceStr);
    const assetInfo = metaData.universe.find(asset => asset.name === symbol);

    if (!assetInfo) continue;

    // Calculate 24h change if we have previous prices
    let change24h = 0;
    let changePercent24h = 0;

    if (previousPrices && previousPrices[symbol]) {
      const previousPrice = parseFloat(previousPrices[symbol]);
      change24h = price - previousPrice;
      changePercent24h = (change24h / previousPrice) * 100;
    }

    assets.push({
      symbol,
      name: symbol, // Using symbol as name for now
      price,
      change24h,
      changePercent24h,
      volume24h: 0, // Volume not available in allMids endpoint
      lastUpdated: Date.now(),
    });
  }

  return assets;
}

/**
 * Transform raw candle data into CandleData objects
 */
export function transformCandleData(
  rawData: HyperliquidCandleResponse
): CandleData[] {
  const candles: CandleData[] = [];

  // Ensure all arrays have the same length
  const length = Math.min(
    rawData.T.length,
    rawData.o.length,
    rawData.h.length,
    rawData.l.length,
    rawData.c.length,
    rawData.v.length
  );

  for (let i = 0; i < length; i++) {
    candles.push({
      time: rawData.T[i],
      open: parseFloat(rawData.o[i]),
      high: parseFloat(rawData.h[i]),
      low: parseFloat(rawData.l[i]),
      close: parseFloat(rawData.c[i]),
      volume: parseFloat(rawData.v[i]),
    });
  }

  return candles;
}

/**
 * Get major crypto assets (filter for popular coins)
 */
export function getMajorCryptoAssets(assets: CryptoAsset[]): CryptoAsset[] {
  const majorCoins = [
    'BTC', 'ETH', 'SOL', 'AVAX', 'BNB', 'ADA', 'DOT', 'MATIC',
    'LINK', 'UNI', 'LTC', 'BCH', 'XRP', 'DOGE', 'ATOM', 'NEAR',
    'FTM', 'ALGO', 'ICP', 'VET', 'THETA', 'AAVE', 'MKR', 'COMP'
  ];

  return assets.filter(asset =>
    majorCoins.some(coin => asset.symbol.includes(coin))
  );
}

/**
 * Rate limiting utility for API calls
 */
class RateLimiter {
  private lastCall = 0;
  private minInterval: number;

  constructor(callsPerSecond = 5) {
    this.minInterval = 1000 / callsPerSecond;
  }

  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;

    if (timeSinceLastCall < this.minInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minInterval - timeSinceLastCall)
      );
    }

    this.lastCall = Date.now();
  }
}

export const rateLimiter = new RateLimiter(5); // 5 calls per second

/**
 * Utility function to validate if an API response contains expected data
 */
export function validateApiResponse<T>(
  data: unknown,
  validator: (data: unknown) => data is T
): T {
  if (!validator(data)) {
    throw new HyperliquidAPIError('Invalid API response format');
  }
  return data;
}

/**
 * Type guards for API responses
 */
export function isMetaResponse(data: unknown): data is HyperliquidMetaResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'universe' in data &&
    Array.isArray((data as any).universe)
  );
}

export function isPricesResponse(data: unknown): data is HyperliquidPricesResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    Object.values(data).every(value => typeof value === 'string')
  );
}

export function isCandleResponse(data: unknown): data is HyperliquidCandleResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'T' in data &&
    'o' in data &&
    'h' in data &&
    'l' in data &&
    'c' in data &&
    'v' in data &&
    Array.isArray((data as any).T)
  );
}

/**
 * Batch API requests with rate limiting
 */
export async function batchApiRequests<T>(
  requests: (() => Promise<T>)[]
): Promise<(T | ApiError)[]> {
  const results: (T | ApiError)[] = [];

  for (const request of requests) {
    try {
      await rateLimiter.throttle();
      const result = await request();
      results.push(result);
    } catch (error) {
      results.push({
        message: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof HyperliquidAPIError ? error.code : undefined,
        status: error instanceof HyperliquidAPIError ? error.status : undefined,
      });
    }
  }

  return results;
}

export { HyperliquidAPIError };