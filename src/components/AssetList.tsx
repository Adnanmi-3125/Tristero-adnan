import React, { useState, useMemo } from 'react';
import { useWebSocketAssets } from '@/hooks/useWebSocketAssets';
import { CryptoAsset } from '@/types/trading';
import { formatCurrency, formatPercentage } from '@/utils/calculations';
import { PriceDisplay } from '@/components/PriceDisplay';
import { usePrices } from '@/hooks/usePriceContext';

interface AssetListProps {
  onAssetSelect?: (asset: CryptoAsset) => void;
  selectedAsset?: string;
  showSearch?: boolean;
  maxItems?: number;
}

type SortField = 'name' | 'price' | 'change' | 'volume';
type SortOrder = 'asc' | 'desc';

// Optimized AssetRow component with memo
const AssetRow = React.memo<{
  asset: CryptoAsset;
  isSelected: boolean;
  onSelect: (asset: CryptoAsset) => void;
}>(({ asset, isSelected, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(asset)}
      className={`grid grid-cols-4 gap-4 p-4 border-b border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer ${isSelected
        ? 'bg-blue-900 border-blue-600'
        : ''
        }`}
    >
      {/* Asset Name */}
      <div className="flex items-center">
        <div>
          <div className="font-semibold text-white text-sm">
            {asset.symbol}
          </div>
          <div className="text-xs text-gray-400">
            {asset.name !== asset.symbol ? asset.name : 'Crypto Asset'}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="text-right">
        <div className="font-mono text-white text-sm">
          <PriceDisplay
            symbol={asset.symbol}
            fallbackPrice={asset.price}
            decimals={asset.price > 1 ? 2 : 6}
            className="font-mono text-white text-sm"
          />
        </div>
        <div className="text-xs text-gray-400">
          {formatCurrency(Math.abs(asset.change24h), 'USD', 2)}
        </div>
      </div>

      {/* 24h Change */}
      <div className="text-right">
        <div
          className={`font-mono text-sm font-medium ${asset.changePercent24h >= 0
            ? 'text-green-400'
            : 'text-red-400'
            }`}
        >
          {formatPercentage(asset.changePercent24h)}
        </div>
        <div
          className={`text-xs ${asset.change24h >= 0
            ? 'text-green-400'
            : 'text-red-400'
            }`}
        >
          {asset.change24h >= 0 ? '+' : ''}
          {formatCurrency(asset.change24h, 'USD', 2)}
        </div>
      </div>

      {/* Volume */}
      <div className="text-right">
        <div className="font-mono text-white text-sm">
          {asset.volume24h > 0
            ? formatCurrency(asset.volume24h, 'USD', 0)
            : 'N/A'
          }
        </div>
        <div className="text-xs text-gray-400">
          24h Vol
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for AssetRow
  return (
    prevProps.asset.symbol === nextProps.asset.symbol &&
    prevProps.asset.price === nextProps.asset.price &&
    prevProps.asset.changePercent24h === nextProps.asset.changePercent24h &&
    prevProps.asset.change24h === nextProps.asset.change24h &&
    prevProps.asset.volume24h === nextProps.asset.volume24h &&
    prevProps.isSelected === nextProps.isSelected
  );
});

AssetRow.displayName = 'AssetRow';

export const AssetList = React.memo<AssetListProps>(({
  onAssetSelect,
  selectedAsset,
  showSearch = true,
  maxItems = Infinity // No limit - show all assets
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [, forceUpdate] = useState({});

  const { data: assets, isLoading, error } = useWebSocketAssets();
  const { isConnected, subscribe } = usePrices();

  // Force re-render when prices update
  React.useEffect(() => {
    if (!subscribe) return;

    const unsubscribe = subscribe(() => {
      // Force a re-render by updating state
      forceUpdate({});
    });

    return unsubscribe;
  }, [subscribe]);

  // Filter and sort assets (already have current WebSocket prices)
  const filteredAndSortedAssets = useMemo(() => {
    if (!assets) return [];

    // Assets already have current WebSocket prices from useWebSocketAssets
    let filtered = assets;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = assets.filter(asset =>
        asset.symbol.toLowerCase().includes(term) ||
        asset.name.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'change':
          aValue = a.changePercent24h;
          bValue = b.changePercent24h;
          break;
        case 'volume':
          aValue = a.volume24h;
          bValue = b.volume24h;
          break;
        case 'name':
        default:
          aValue = a.symbol;
          bValue = b.symbol;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    // Apply limit
    return filtered.slice(0, maxItems);
  }, [assets, searchTerm, sortField, sortOrder, maxItems]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) {
      return '↕️';
    }
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (error) {
    return (
      <div className="bg-red-900 border border-red-600 rounded-lg p-6">
        <h3 className="text-red-300 font-semibold mb-2">Failed to Load Assets</h3>
        <p className="text-red-200 text-sm">
          {error instanceof Error ? error.message : 'Unable to fetch market data'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background border border-border-primary rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-border-primary">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">Market Assets</h2>
          <div className="flex items-center gap-2 text-sm">
            <div className={`flex items-center gap-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span>{isConnected ? 'Live' : 'Disconnected'}</span>
            </div>
            <div className="text-gray-400">
              {filteredAndSortedAssets.length} assets
            </div>
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border-primary rounded-md px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="absolute right-3 top-2.5 text-text-secondary">
              🔍
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading market data...</p>
        </div>
      ) : (
        <>
          {/* Table Header */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-750 border-b border-gray-600 text-sm font-medium text-gray-300">
            <button
              onClick={() => handleSort('name')}
              className="text-left hover:text-white transition-colors flex items-center gap-1"
            >
              Asset {getSortIcon('name')}
            </button>
            <button
              onClick={() => handleSort('price')}
              className="text-right hover:text-white transition-colors flex items-center justify-end gap-1"
            >
              Price {getSortIcon('price')}
            </button>
            <button
              onClick={() => handleSort('change')}
              className="text-right hover:text-white transition-colors flex items-center justify-end gap-1"
            >
              24h Change {getSortIcon('change')}
            </button>
            <button
              onClick={() => handleSort('volume')}
              className="text-right hover:text-white transition-colors flex items-center justify-end gap-1"
            >
              Volume {getSortIcon('volume')}
            </button>
          </div>

          {/* Asset List */}
          <div className="max-h-[600px] overflow-y-auto">
            {filteredAndSortedAssets.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                {searchTerm ? 'No assets found matching your search.' : 'No assets available.'}
              </div>
            ) : (
              filteredAndSortedAssets.map((asset) => (
                <AssetRow
                  key={asset.symbol}
                  asset={asset}
                  isSelected={selectedAsset === asset.symbol}
                  onSelect={onAssetSelect || (() => { })}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="p-3 bg-surface text-xs text-text-secondary text-center border-t border-border-primary">
        {isConnected ? 'Real-time WebSocket data' : 'WebSocket disconnected'} • {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.selectedAsset === nextProps.selectedAsset &&
    prevProps.showSearch === nextProps.showSearch &&
    prevProps.maxItems === nextProps.maxItems
  );
});