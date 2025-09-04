import { QueryClient } from '@tanstack/react-query';
import { HyperliquidAPIError } from './hyperliquid';

// Default stale time for different types of data
const STALE_TIMES = {
  MARKET_META: 5 * 60 * 1000, // 5 minutes - market data changes infrequently
  PRICE_DATA: 10 * 1000, // 10 seconds - prices update frequently
  CANDLE_DATA: 60 * 1000, // 1 minute - historical data updates less frequently
} as const;

// Create and configure React Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults
      staleTime: STALE_TIMES.PRICE_DATA,
      retry: (failureCount, error) => {
        // Don't retry on client errors (4xx)
        if (error instanceof HyperliquidAPIError && error.status && error.status >= 400 && error.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false, // Don't refetch on window focus for trading data
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: false, // Don't retry mutations (trades, orders)
    },
  },
});

// Query key factories for consistent cache management
export const queryKeys = {
  // Market data queries
  marketMeta: ['market', 'meta'] as const,
  allPrices: ['market', 'prices'] as const,
  
  // Asset-specific queries
  asset: (symbol: string) => ['asset', symbol] as const,
  assetCandles: (symbol: string, interval: string) => 
    ['asset', symbol, 'candles', interval] as const,
  
  // Portfolio queries
  portfolio: (id: string) => ['portfolio', id] as const,
  portfolios: ['portfolios'] as const,
  
  // Position and transaction queries
  positions: (portfolioId: string) => ['positions', portfolioId] as const,
  transactions: (portfolioId: string) => ['transactions', portfolioId] as const,
} as const;

// Utility function to invalidate related queries
export const invalidateQueries = {
  marketData: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.allPrices });
  },
  
  assetData: (symbol: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.asset(symbol) });
  },
  
  portfolioData: (portfolioId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.portfolio(portfolioId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.positions(portfolioId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions(portfolioId) });
  },
  
  allPortfolios: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.portfolios });
  },
} as const;

// Utility function to update cache with new data (for real-time updates)
export const updateCache = {
  prices: (newPrices: Record<string, string>) => {
    queryClient.setQueryData(queryKeys.allPrices, newPrices);
  },
  
  assetPrice: (symbol: string, price: number) => {
    // Update the all prices cache
    queryClient.setQueryData(queryKeys.allPrices, (oldData: Record<string, string> | undefined) => {
      if (!oldData) return undefined;
      return {
        ...oldData,
        [symbol]: price.toString(),
      };
    });
  },
} as const;

// Prefetch utilities for better UX
export const prefetchQueries = {
  marketData: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.marketMeta,
      staleTime: STALE_TIMES.MARKET_META,
    });
    
    await queryClient.prefetchQuery({
      queryKey: queryKeys.allPrices,
      staleTime: STALE_TIMES.PRICE_DATA,
    });
  },
  
  assetCandles: async (symbol: string, interval: string = '1h') => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.assetCandles(symbol, interval),
      staleTime: STALE_TIMES.CANDLE_DATA,
    });
  },
} as const;