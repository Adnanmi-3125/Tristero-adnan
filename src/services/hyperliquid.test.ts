import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getMarketMeta,
  getAllMids,
  getCandleSnapshot,
  transformPriceData,
  transformCandleData,
  getMajorCryptoAssets,
  HyperliquidAPIError,
  isMetaResponse,
  isPricesResponse,
  isCandleResponse,
  rateLimiter,
  batchApiRequests,
} from './hyperliquid';
import { HyperliquidMetaResponse, HyperliquidPricesResponse, HyperliquidCandleResponse } from '@/types/trading';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Hyperliquid API Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Request Functions', () => {
    describe('getMarketMeta', () => {
      it('should fetch market metadata successfully', async () => {
        const mockResponse: HyperliquidMetaResponse = {
          universe: [
            { name: 'BTC', szDecimals: 5, maxLeverage: 20, onlyIsolated: false },
            { name: 'ETH', szDecimals: 4, maxLeverage: 20, onlyIsolated: false },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await getMarketMeta();
        
        expect(mockFetch).toHaveBeenCalledWith('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'meta' }),
        });
        expect(result).toEqual(mockResponse);
      });

      it('should handle API errors properly', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

        await expect(getMarketMeta()).rejects.toThrow(HyperliquidAPIError);
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        await expect(getMarketMeta()).rejects.toThrow('Network error: Unable to connect to API');
      });
    });

    describe('getAllMids', () => {
      it('should fetch all prices successfully', async () => {
        const mockResponse: HyperliquidPricesResponse = {
          'BTC': '45000.50',
          'ETH': '3200.25',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await getAllMids();
        
        expect(mockFetch).toHaveBeenCalledWith('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'allMids' }),
        });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getCandleSnapshot', () => {
      it('should fetch candle data with default parameters', async () => {
        const mockResponse: HyperliquidCandleResponse = {
          T: [1640995200000, 1640998800000],
          o: ['45000', '45100'],
          h: ['45200', '45300'],
          l: ['44900', '45000'],
          c: ['45100', '45250'],
          v: ['100.5', '150.3'],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await getCandleSnapshot('BTC');
        
        expect(mockFetch).toHaveBeenCalledWith('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'candleSnapshot',
            req: { coin: 'BTC', interval: '1h' },
          }),
        });
        expect(result).toEqual(mockResponse);
      });

      it('should include startTime when provided', async () => {
        const startTime = 1640995200000;
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce({ T: [], o: [], h: [], l: [], c: [], v: [] }),
        });

        await getCandleSnapshot('BTC', '1h', startTime);
        
        expect(mockFetch).toHaveBeenCalledWith('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'candleSnapshot',
            req: { coin: 'BTC', interval: '1h', startTime },
          }),
        });
      });
    });
  });

  describe('Data Transformation Functions', () => {
    describe('transformPriceData', () => {
      it('should transform price data correctly', () => {
        const pricesData: HyperliquidPricesResponse = {
          'BTC': '45000.50',
          'ETH': '3200.25',
        };

        const metaData: HyperliquidMetaResponse = {
          universe: [
            { name: 'BTC', szDecimals: 5, maxLeverage: 20, onlyIsolated: false },
            { name: 'ETH', szDecimals: 4, maxLeverage: 20, onlyIsolated: false },
          ],
        };

        const result = transformPriceData(pricesData, metaData);
        
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          symbol: 'BTC',
          name: 'BTC',
          price: 45000.50,
          change24h: 0,
          changePercent24h: 0,
        });
        expect(result[1]).toMatchObject({
          symbol: 'ETH',
          name: 'ETH',
          price: 3200.25,
        });
      });

      it('should calculate price changes when previous prices provided', () => {
        const pricesData: HyperliquidPricesResponse = { 'BTC': '45000' };
        const metaData: HyperliquidMetaResponse = {
          universe: [{ name: 'BTC', szDecimals: 5, maxLeverage: 20, onlyIsolated: false }],
        };
        const previousPrices: HyperliquidPricesResponse = { 'BTC': '44000' };

        const result = transformPriceData(pricesData, metaData, previousPrices);
        
        expect(result[0]).toMatchObject({
          change24h: 1000,
          changePercent24h: expect.closeTo(2.27, 2),
        });
      });

      it('should filter out assets not in meta data', () => {
        const pricesData: HyperliquidPricesResponse = {
          'BTC': '45000',
          'UNKNOWN': '100',
        };
        const metaData: HyperliquidMetaResponse = {
          universe: [{ name: 'BTC', szDecimals: 5, maxLeverage: 20, onlyIsolated: false }],
        };

        const result = transformPriceData(pricesData, metaData);
        
        expect(result).toHaveLength(1);
        expect(result[0].symbol).toBe('BTC');
      });
    });

    describe('transformCandleData', () => {
      it('should transform candle data correctly', () => {
        const rawData: HyperliquidCandleResponse = {
          T: [1640995200000, 1640998800000],
          o: ['45000', '45100'],
          h: ['45200', '45300'],
          l: ['44900', '45000'],
          c: ['45100', '45250'],
          v: ['100.5', '150.3'],
        };

        const result = transformCandleData(rawData);
        
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          time: 1640995200000,
          open: 45000,
          high: 45200,
          low: 44900,
          close: 45100,
          volume: 100.5,
        });
        expect(result[1]).toEqual({
          time: 1640998800000,
          open: 45100,
          high: 45300,
          low: 45000,
          close: 45250,
          volume: 150.3,
        });
      });

      it('should handle arrays of different lengths', () => {
        const rawData: HyperliquidCandleResponse = {
          T: [1640995200000],
          o: ['45000', '45100'], // Extra element
          h: ['45200'],
          l: ['44900'],
          c: ['45100'],
          v: ['100.5'],
        };

        const result = transformCandleData(rawData);
        
        // Should only process the minimum length
        expect(result).toHaveLength(1);
      });
    });

    describe('getMajorCryptoAssets', () => {
      it('should filter major crypto assets', () => {
        const assets = [
          { symbol: 'BTC', name: 'BTC', price: 45000, change24h: 0, changePercent24h: 0, volume24h: 0, lastUpdated: 0 },
          { symbol: 'ETH', name: 'ETH', price: 3200, change24h: 0, changePercent24h: 0, volume24h: 0, lastUpdated: 0 },
          { symbol: 'OBSCURE', name: 'OBSCURE', price: 1, change24h: 0, changePercent24h: 0, volume24h: 0, lastUpdated: 0 },
        ];

        const result = getMajorCryptoAssets(assets);
        
        expect(result).toHaveLength(2);
        expect(result.map(a => a.symbol)).toEqual(['BTC', 'ETH']);
      });
    });
  });

  describe('Type Guards', () => {
    describe('isMetaResponse', () => {
      it('should validate correct meta response', () => {
        const validResponse = {
          universe: [{ name: 'BTC', szDecimals: 5, maxLeverage: 20, onlyIsolated: false }],
        };
        
        expect(isMetaResponse(validResponse)).toBe(true);
      });

      it('should reject invalid meta response', () => {
        expect(isMetaResponse({})).toBe(false);
        expect(isMetaResponse({ universe: 'invalid' })).toBe(false);
        expect(isMetaResponse(null)).toBe(false);
      });
    });

    describe('isPricesResponse', () => {
      it('should validate correct prices response', () => {
        const validResponse = { 'BTC': '45000', 'ETH': '3200' };
        
        expect(isPricesResponse(validResponse)).toBe(true);
      });

      it('should reject invalid prices response', () => {
        expect(isPricesResponse({ 'BTC': 45000 })).toBe(false); // Numbers instead of strings
        expect(isPricesResponse(null)).toBe(false);
        expect(isPricesResponse('invalid')).toBe(false);
      });
    });

    describe('isCandleResponse', () => {
      it('should validate correct candle response', () => {
        const validResponse = {
          T: [1640995200000],
          o: ['45000'],
          h: ['45200'],
          l: ['44900'],
          c: ['45100'],
          v: ['100.5'],
        };
        
        expect(isCandleResponse(validResponse)).toBe(true);
      });

      it('should reject invalid candle response', () => {
        expect(isCandleResponse({})).toBe(false);
        expect(isCandleResponse({ T: 'invalid' })).toBe(false);
        expect(isCandleResponse(null)).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('rateLimiter', () => {
      it('should throttle API calls', async () => {
        const start = Date.now();
        
        await rateLimiter.throttle();
        await rateLimiter.throttle();
        
        const elapsed = Date.now() - start;
        
        // Should take at least 200ms for 5 calls per second rate limit
        expect(elapsed).toBeGreaterThan(150);
      });
    });

    describe('batchApiRequests', () => {
      it('should handle successful batch requests', async () => {
        const requests = [
          () => Promise.resolve('result1'),
          () => Promise.resolve('result2'),
        ];

        const results = await batchApiRequests(requests);
        
        expect(results).toEqual(['result1', 'result2']);
      });

      it('should handle mixed success and failure', async () => {
        const requests = [
          () => Promise.resolve('success'),
          () => Promise.reject(new Error('failure')),
        ];

        const results = await batchApiRequests(requests);
        
        expect(results).toHaveLength(2);
        expect(results[0]).toBe('success');
        expect(results[1]).toMatchObject({
          message: 'failure',
        });
      });
    });
  });

  describe('HyperliquidAPIError', () => {
    it('should create error with message and status', () => {
      const error = new HyperliquidAPIError('Test error', 404, 'NOT_FOUND');
      
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('HyperliquidAPIError');
    });
  });
});