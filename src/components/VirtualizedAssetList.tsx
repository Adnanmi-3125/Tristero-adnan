import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { useOptimizedPriceStream } from '@/hooks/useOptimizedPriceStream';
import { AssetDetailModal } from '@/components/AssetDetailModal';
import { formatCurrency, formatPercentage } from '@/utils/calculations';
import type { CryptoAsset } from '@/types/trading';

interface VirtualizedAssetListProps {
    onAssetSelect?: (asset: CryptoAsset) => void;
    selectedAsset?: CryptoAsset | null;
    maxItems?: number;
}

// Virtual scrolling configuration
const ITEM_HEIGHT = 80;
const CONTAINER_HEIGHT = 600;
const OVERSCAN = 5;

export const VirtualizedAssetList = React.memo<VirtualizedAssetListProps>(({
    onAssetSelect,
    selectedAsset,
    maxItems = Infinity
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'change'>('price');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [scrollTop, setScrollTop] = useState(0);
    const [detailModalAsset, setDetailModalAsset] = useState<CryptoAsset | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const { assetsWithPrices, isConnected, priceCount, connectionStatus } = useOptimizedPriceStream();

    // Filter and search assets
    const filteredAssets = useMemo(() => {
        let filtered = assetsWithPrices;

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(asset =>
                asset.symbol.toLowerCase().includes(term) ||
                asset.name.toLowerCase().includes(term)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue: number;
            let bValue: number;

            switch (sortBy) {
                case 'symbol':
                    return sortOrder === 'asc'
                        ? a.symbol.localeCompare(b.symbol)
                        : b.symbol.localeCompare(a.symbol);
                case 'price':
                    aValue = a.price;
                    bValue = b.price;
                    break;
                case 'change':
                    aValue = a.changePercent24h;
                    bValue = b.changePercent24h;
                    break;
                default:
                    return 0;
            }

            return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        });

        // Apply maxItems limit
        return filtered.slice(0, maxItems);
    }, [assetsWithPrices, searchTerm, sortBy, sortOrder, maxItems]);

    // Virtual scrolling calculations
    const visibleStart = Math.floor(scrollTop / ITEM_HEIGHT);
    const visibleEnd = Math.min(
        visibleStart + Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT) + OVERSCAN,
        filteredAssets.length
    );
    const visibleItems = filteredAssets.slice(
        Math.max(0, visibleStart - OVERSCAN),
        visibleEnd
    );
    const offsetY = Math.max(0, (visibleStart - OVERSCAN) * ITEM_HEIGHT);

    // Handle scroll events
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Handle sorting
    const handleSort = useCallback((field: typeof sortBy) => {
        if (field === sortBy) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    }, [sortBy]);

    // Get sort icon
    const getSortIcon = useCallback((field: typeof sortBy) => {
        if (field !== sortBy) return '↕️';
        return sortOrder === 'asc' ? '↑' : '↓';
    }, [sortBy, sortOrder]);

    // Handle asset selection
    const handleAssetClick = useCallback((asset: CryptoAsset) => {
        onAssetSelect?.(asset);
    }, [onAssetSelect]);

    // Performance metrics
    const performanceInfo = useMemo(() => ({
        totalAssets: assetsWithPrices.length,
        filteredAssets: filteredAssets.length,
        renderedItems: visibleItems.length,
        renderRatio: filteredAssets.length > 0 ? (visibleItems.length / filteredAssets.length) * 100 : 0,
    }), [assetsWithPrices.length, filteredAssets.length, visibleItems.length]);

    return (
        <div className="bg-background border border-border-primary rounded-lg">
            {/* Header */}
            <div className="p-4 border-b border-border-primary">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-text-primary">Market Assets</h2>
                    <div className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className="text-text-secondary">
                            {connectionStatus} • {priceCount} assets
                        </span>
                    </div>
                </div>

                {/* Search and controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background border border-border-primary rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary-500 placeholder-text-secondary"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSort('symbol')}
                            className="px-3 py-2 bg-surface border border-border-primary rounded text-text-primary text-sm hover:bg-surface-hover"
                        >
                            Symbol {getSortIcon('symbol')}
                        </button>
                        <button
                            onClick={() => handleSort('price')}
                            className="px-3 py-2 bg-surface border border-border-primary rounded text-text-primary text-sm hover:bg-surface-hover"
                        >
                            Price {getSortIcon('price')}
                        </button>
                    </div>
                </div>

                {/* Performance info (dev mode) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-gray-500 mb-2">
                        Rendering {performanceInfo.renderedItems}/{performanceInfo.filteredAssets} items
                        ({performanceInfo.renderRatio.toFixed(1)}% of filtered)
                    </div>
                )}
            </div>

            {/* Virtualized list */}
            <div
                ref={containerRef}
                className="relative overflow-auto"
                style={{ height: CONTAINER_HEIGHT }}
                onScroll={handleScroll}
            >
                {/* Virtual container */}
                <div style={{ height: filteredAssets.length * ITEM_HEIGHT, position: 'relative' }}>
                    {/* Visible items */}
                    <div style={{ transform: `translateY(${offsetY}px)` }}>
                        {visibleItems.map((asset, index) => {
                            const actualIndex = Math.max(0, visibleStart - OVERSCAN) + index;
                            const isSelected = selectedAsset?.symbol === asset.symbol;

                            return (
                                <div
                                    key={asset.symbol}
                                    className={`
                    absolute w-full cursor-pointer transition-colors duration-150
                    ${isSelected
                                            ? 'bg-blue-900 border-blue-600'
                                            : 'hover:bg-gray-750 border-transparent'
                                        }
                    border-l-2 px-4 py-3 flex items-center justify-between
                  `}
                                    style={{
                                        height: ITEM_HEIGHT,
                                        top: (actualIndex * ITEM_HEIGHT) - offsetY
                                    }}
                                    onClick={() => handleAssetClick(asset)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                                    {asset.symbol.slice(0, 2)}
                                                </div>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-white text-sm truncate">
                                                    {asset.symbol}
                                                </div>
                                                <div className="text-gray-400 text-xs truncate">
                                                    Crypto Asset
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-white font-semibold text-sm">
                                                {formatCurrency(asset.price)}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs">
                                                {asset.changePercent24h >= 0 ? (
                                                    <TrendingUp className="w-3 h-3 text-green-400" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3 text-red-400" />
                                                )}
                                                <span className={asset.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                    {formatPercentage(asset.changePercent24h)}
                                                </span>
                                            </div>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDetailModalAsset(asset);
                                            }}
                                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                        >
                                            <BarChart3 className="w-4 h-4 text-gray-300" />
                                        </motion.button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Loading indicator */}
                {!isConnected && (
                    <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <div className="text-white text-sm">Connecting to market data...</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer with stats */}
            <div className="p-3 border-t border-border-primary text-center text-sm text-text-secondary">
                <div className="flex justify-between items-center">
                    <span>
                        Showing {Math.min(filteredAssets.length, maxItems)} of {performanceInfo.totalAssets} assets
                    </span>
                    <span className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                        Real-time WebSocket data
                    </span>
                </div>
            </div>

            {/* Asset Detail Modal */}
            <AssetDetailModal
                asset={detailModalAsset}
                isOpen={!!detailModalAsset}
                onClose={() => setDetailModalAsset(null)}
                onTrade={(asset) => {
                    setDetailModalAsset(null);
                    onAssetSelect?.(asset);
                }}
            />
        </div>
    );
});

VirtualizedAssetList.displayName = 'VirtualizedAssetList';
