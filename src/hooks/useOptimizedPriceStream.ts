import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { HyperliquidWebSocketClient } from '@/services/hyperliquidWebSocket';

// Query keys for price data
export const priceQueryKeys = {
    allPrices: ['prices', 'all'] as const,
    assetPrice: (symbol: string) => ['prices', symbol] as const,
    priceStream: ['prices', 'stream'] as const,
} as const;

// Optimized price stream with TanStack Query integration
export const useOptimizedPriceStream = () => {
    const queryClient = useQueryClient();
    const wsClientRef = useRef<HyperliquidWebSocketClient | null>(null);
    const pricesRef = useRef<Record<string, number>>({});
    const subscribersRef = useRef<Set<() => void>>(new Set());
    const lastUpdateRef = useRef<number>(0);

    // Debounced update function for performance
    const debouncedUpdate = useCallback(() => {
        const now = Date.now();
        if (now - lastUpdateRef.current < 100) return; // Debounce to 10 FPS max

        lastUpdateRef.current = now;

        // Update TanStack Query cache
        queryClient.setQueryData(priceQueryKeys.allPrices, { ...pricesRef.current });

        // Notify subscribers
        subscribersRef.current.forEach(callback => callback());
    }, [queryClient]);

    // Initialize WebSocket connection
    const { data: isConnected = false } = useQuery({
        queryKey: priceQueryKeys.priceStream,
        queryFn: async () => {
            if (wsClientRef.current) {
                wsClientRef.current.disconnect();
            }

            wsClientRef.current = new HyperliquidWebSocketClient();

            // Type assertion for the WebSocket client
            (wsClientRef.current as any).onPriceUpdate = (newPrices: Record<string, unknown>) => {
                // Filter out @ prefixed symbols and update prices
                Object.entries(newPrices).forEach(([symbol, price]) => {
                    if (!symbol.startsWith('@') && typeof price === 'number') {
                        pricesRef.current[symbol] = price;
                    }
                });

                // Debounced update to prevent excessive re-renders
                debouncedUpdate();
            };

            await wsClientRef.current.connect();
            return true;
        },
        staleTime: Infinity,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsClientRef.current) {
                wsClientRef.current.disconnect();
                wsClientRef.current = null;
            }
        };
    }, []);

    // Get current prices from cache
    const { data: allPrices = {} } = useQuery({
        queryKey: priceQueryKeys.allPrices,
        queryFn: () => pricesRef.current,
        staleTime: 0, // Always fresh
        refetchInterval: false, // Don't poll, rely on WebSocket updates
    });

    // Optimized price getter with memoization
    const getPrice = useCallback((symbol: string): number | null => {
        return allPrices[symbol] || null;
    }, [allPrices]);

    // Subscription system for components
    const subscribe = useCallback((callback: () => void) => {
        subscribersRef.current.add(callback);
        return () => {
            subscribersRef.current.delete(callback);
        };
    }, []);

    // Asset list with live prices (optimized)
    const assetsWithPrices = useMemo(() => {
        return Object.entries(allPrices)
            .filter(([symbol]) => !symbol.startsWith('@'))
            .map(([symbol, price]) => ({
                symbol,
                name: symbol, // Could be enhanced with metadata
                price,
                change24h: 0, // Would need historical data
                changePercent24h: 0,
                volume24h: 0,
                lastUpdated: Date.now(),
            }))
            .sort((a, b) => b.price - a.price); // Sort by price descending
    }, [allPrices]);

    return {
        isConnected,
        allPrices,
        assetsWithPrices,
        getPrice,
        subscribe,
        connectionStatus: isConnected ? 'connected' : 'connecting',
        priceCount: Object.keys(allPrices).length,
    };
};

// Hook for specific asset price with caching
export const useOptimizedAssetPrice = (symbol: string) => {
    const { getPrice } = useOptimizedPriceStream();

    return useQuery({
        queryKey: priceQueryKeys.assetPrice(symbol),
        queryFn: () => getPrice(symbol),
        staleTime: 1000, // 1 second
        refetchInterval: 1000, // Fallback polling
        enabled: !!symbol,
    });
};

// Performance monitoring hook
export const usePriceStreamPerformance = () => {
    const updateCountRef = useRef(0);
    const startTimeRef = useRef(Date.now());

    const { subscribe } = useOptimizedPriceStream();

    useEffect(() => {
        const unsubscribe = subscribe(() => {
            updateCountRef.current++;
        });

        return unsubscribe;
    }, [subscribe]);

    return useMemo(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const updatesPerSecond = elapsed > 0 ? updateCountRef.current / elapsed : 0;

        return {
            totalUpdates: updateCountRef.current,
            updatesPerSecond: Math.round(updatesPerSecond * 100) / 100,
            elapsed: Math.round(elapsed),
        };
    }, []);
};
