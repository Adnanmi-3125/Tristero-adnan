import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Search } from 'lucide-react';
import { useWebSocketAssets } from '@/hooks/useWebSocketAssets';
import { AssetDetailModal } from '@/components/AssetDetailModal';
import { CryptoAsset } from '@/types/trading';
import { PriceDisplay } from '@/components/PriceDisplay';
import { usePrices } from '@/hooks/usePriceContext';

interface EnhancedAssetListProps {
  onAssetSelect?: (asset: CryptoAsset) => void;
  selectedAsset?: CryptoAsset | null;
  showSearch?: boolean;
  maxItems?: number;
}

type SortField = 'name' | 'price' | 'change' | 'volume';
type SortOrder = 'asc' | 'desc';

// Enhanced AssetRow component with chart button
const AssetRow = React.memo<{
  asset: CryptoAsset;
  isSelected: boolean;
  onSelect: (asset: CryptoAsset) => void;
  onShowChart: (asset: CryptoAsset) => void;
}>(({ asset, isSelected, onSelect, onShowChart }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 border-b border-border-primary hover:bg-surface-hover transition-colors ${isSelected ? 'bg-primary-900 border-primary-600' : ''
        }`}
    >
      {/* Mobile: Single column layout */}
      <div className="sm:hidden flex items-center justify-between w-full">
        <div className="flex items-center flex-1">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">
            {asset.symbol.slice(0, 2)}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-text-primary text-sm">
              {asset.symbol}
            </div>
            <div className="font-mono text-text-primary text-xs">
              <PriceDisplay
                symbol={asset.symbol}
                fallbackPrice={asset.price}
                decimals={asset.price > 1 ? 2 : 6}
                className="font-mono text-text-primary text-xs"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onShowChart(asset);
            }}
            className="p-2 bg-surface hover:bg-surface-hover rounded-lg transition-colors border border-border-primary"
            title="View Chart"
          >
            <BarChart3 className="w-4 h-4 text-text-secondary" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(asset)}
            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-lg transition-colors"
          >
            Trade
          </motion.button>
        </div>
      </div>

      {/* Desktop: 3 column layout */}
      <div className="hidden sm:contents">
        {/* Asset Name */}
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">
            {asset.symbol.slice(0, 2)}
          </div>
          <div>
            <div className="font-semibold text-text-primary text-sm">
              {asset.symbol}
            </div>
            <div className="text-xs text-text-secondary">
              {asset.name !== asset.symbol ? asset.name : 'Crypto Asset'}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="text-right">
          <div className="font-mono text-text-primary text-sm">
            <PriceDisplay
              symbol={asset.symbol}
              fallbackPrice={asset.price}
              decimals={asset.price > 1 ? 2 : 6}
              className="font-mono text-text-primary text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onShowChart(asset);
            }}
            className="p-2 bg-surface hover:bg-surface-hover rounded-lg transition-colors border border-border-primary"
            title="View Chart"
          >
            <BarChart3 className="w-4 h-4 text-text-secondary" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(asset)}
            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-lg transition-colors"
          >
            Trade
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
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

export const EnhancedAssetList = React.memo<EnhancedAssetListProps>(({
  onAssetSelect,
  selectedAsset,
  showSearch = true,
  maxItems = Infinity,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [, forceUpdate] = useState({});
  const [detailModalAsset, setDetailModalAsset] = useState<CryptoAsset | null>(null);

  const { data: assets, isLoading, error } = useWebSocketAssets();
  const { isConnected, subscribe } = usePrices();

  // Force re-render when prices update
  React.useEffect(() => {
    if (!subscribe) return;

    const unsubscribe = subscribe(() => {
      forceUpdate({});
    });

    return unsubscribe;
  }, [subscribe]);

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    if (!assets) return [];

    let filtered = assets;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(term) ||
          asset.name.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
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
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted.slice(0, maxItems);
  }, [assets, searchTerm, sortField, sortOrder, maxItems]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (isLoading) {
    return (
      <div className="bg-surface border border-border-primary rounded-lg p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="w-8 h-8 bg-surface-hover rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface-hover rounded w-1/4" />
                <div className="h-3 bg-surface-hover rounded w-1/6" />
              </div>
              <div className="h-4 bg-surface-hover rounded w-1/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface border border-border-primary rounded-lg p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Connection Error</h3>
        <p className="text-text-secondary">Failed to load market data</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-primary rounded-lg overflow-hidden">
      {/* Header */}
      {showSearch && (
        <div className="p-3 sm:p-4 border-b border-border-primary">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border-primary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      )}

      {/* Column Headers */}
      <div className="hidden sm:grid grid-cols-3 gap-4 p-4 bg-surface border-b border-border-primary text-sm font-medium text-text-secondary">
        <button
          onClick={() => handleSort('name')}
          className="text-left hover:text-text-primary transition-colors"
        >
          Asset {getSortIcon('name')}
        </button>
        <button
          onClick={() => handleSort('price')}
          className="text-right hover:text-text-primary transition-colors"
        >
          Price {getSortIcon('price')}
        </button>
        <div className="text-right">Actions</div>
      </div>

      {/* Asset List */}
      <div className="max-h-[600px] overflow-y-auto">
        {filteredAndSortedAssets.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            {searchTerm ? 'No assets found matching your search.' : 'No assets available.'}
          </div>
        ) : (
          <motion.div>
            {filteredAndSortedAssets.map((asset, index) => (
              <motion.div
                key={asset.symbol}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AssetRow
                  asset={asset}
                  isSelected={selectedAsset?.symbol === asset.symbol}
                  onSelect={onAssetSelect || (() => { })}
                  onShowChart={setDetailModalAsset}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-surface text-xs text-text-secondary text-center border-t border-border-primary">
        <div className="flex justify-between items-center">
          <span>
            Showing {filteredAndSortedAssets.length} of {assets?.length || 0} assets
          </span>
          <span className="flex items-center gap-1">
            <div
              className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}
            />
            {isConnected ? 'Real-time WebSocket data' : 'WebSocket disconnected'}
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

EnhancedAssetList.displayName = 'EnhancedAssetList';
