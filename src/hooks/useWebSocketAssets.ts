import { useState, useEffect } from 'react';
import { usePrices } from '@/hooks/usePriceContext';
import { CryptoAsset } from '@/types/trading';

/**
 * Hook that creates asset list directly from WebSocket price data
 * This ensures we show ALL assets that have live prices, not just a predefined list
 */
export function useWebSocketAssets() {
    const [assets, setAssets] = useState<CryptoAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { subscribe, isConnected } = usePrices();

    useEffect(() => {
        if (!subscribe) return;

        const unsubscribe = subscribe((newPrices: Record<string, number>) => {
            // Convert WebSocket price data to CryptoAsset format
            const assetList: CryptoAsset[] = Object.entries(newPrices).map(([symbol, price]) => ({
                symbol,
                name: symbol, // Use symbol as name since we don't have metadata
                price,
                change24h: 0, // We don't have 24h change data from WebSocket
                changePercent24h: 0,
                volume24h: 0, // We don't have volume data from WebSocket
                lastUpdated: Date.now(),
            }));

            // Sort by symbol name for consistent display
            assetList.sort((a, b) => a.symbol.localeCompare(b.symbol));

            setAssets(assetList);
            setIsLoading(false);
        });

        return unsubscribe;
    }, [subscribe]);

    // Initialize with current prices if available
    useEffect(() => {
        if (!isConnected) return;

        // Try to get initial data by triggering a manual check
        // This is a fallback in case we missed the initial WebSocket update
        const timer = setTimeout(() => {
            if (assets.length === 0) {
                setIsLoading(false); // Stop loading even if no data yet
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [isConnected, assets.length]);

    return {
        data: assets,
        isLoading: isLoading && isConnected, // Only show loading if connected but no data yet
        error: !isConnected ? new Error('WebSocket not connected') : null,
    };
}
