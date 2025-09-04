import React, { useState, useMemo, useRef, useEffect, useContext, useCallback } from 'react';
import { ChevronUp, ChevronDown, TrendingUp, Hash, DollarSign, Target, Clock, X } from 'lucide-react';
import { usePortfolioStore, Position } from '@/state/portfolioStore';
import { usePrices } from '@/hooks/usePriceContext';
import { PriceContext } from '@/context/PriceContext';
import { PriceDisplay } from '@/components/PriceDisplay';
import { LivePriceValue } from '@/components/LivePriceValue';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { formatCurrency, formatPercentage } from '@/utils/calculations';

interface PositionWithMetrics extends Position {
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  duration: string;
}

export const PositionsTable = React.memo(() => {
  const [sortField, setSortField] = useState<keyof PositionWithMetrics>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [positionToClose, setPositionToClose] = useState<PositionWithMetrics | null>(null);

  const { getActivePortfolio, closePosition } = usePortfolioStore();
  const { getPrice, subscribe } = usePrices();

  const activePortfolio = getActivePortfolio();
  const [, forceUpdate] = useState({});

  // Force re-render when prices update
  React.useEffect(() => {
    if (!subscribe) return;

    const unsubscribe = subscribe(() => {
      // Trigger a re-render by updating a dummy state
      forceUpdate({});
    });

    return unsubscribe;
  }, [subscribe]);

  // Calculate position metrics with live prices
  const positionsWithMetrics = useMemo((): PositionWithMetrics[] => {
    if (!activePortfolio?.positions.length) return [];

    return activePortfolio.positions.map(position => {
      const currentPrice = getPrice(position.symbol) || position.entryPrice;
      const marketValue = position.quantity * currentPrice;
      const costBasis = position.quantity * position.entryPrice;
      const unrealizedPnL = marketValue - costBasis;
      const unrealizedPnLPercent = (unrealizedPnL / costBasis) * 100;

      // Calculate duration
      const durationMs = Date.now() - position.entryTime;
      const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      let duration: string;
      if (days > 0) {
        duration = `${days}d ${hours}h`;
      } else if (hours > 0) {
        duration = `${hours}h ${minutes}m`;
      } else {
        duration = `${minutes}m`;
      }

      return {
        ...position,
        currentPrice,
        marketValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        duration,
      };
    });
  }, [activePortfolio?.positions, getPrice]);

  // Sort positions
  const sortedPositions = useMemo(() => {
    if (!positionsWithMetrics.length) return [];

    return [...positionsWithMetrics].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Handle number sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [positionsWithMetrics, sortField, sortOrder]);

  const handleSort = (field: keyof PositionWithMetrics) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: keyof PositionWithMetrics) => {
    if (field !== sortField) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const handleClosePosition = async (position: PositionWithMetrics) => {
    setPositionToClose(position);
  };

  const confirmClosePosition = () => {
    if (positionToClose) {
      const success = closePosition(positionToClose.id, positionToClose.currentPrice);
      if (!success) {
        // Could add error state here
        console.error('Failed to close position');
      }
      setPositionToClose(null);
    }
  };

  // Calculate totals
  const totalMarketValue = sortedPositions.reduce((sum, pos) => sum + pos.marketValue, 0);
  const totalUnrealizedPnL = sortedPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  const totalCostBasis = sortedPositions.reduce((sum, pos) => sum + (pos.quantity * pos.entryPrice), 0);
  const totalPnLPercent = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;

  if (!activePortfolio) {
    return (
      <div className="bg-surface border border-border-primary rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold mb-2 text-text-primary">No Portfolio Selected</h3>
        <p className="text-text-secondary">
          Please select a portfolio to view positions
        </p>
      </div>
    );
  }

  if (!sortedPositions.length) {
    return (
      <div className="bg-surface border border-border-primary rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-xl font-semibold mb-2 text-text-primary">No Open Positions</h3>
        <p className="text-text-secondary">
          Start trading to see your positions here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-primary rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-border-primary">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">Active Positions</h2>
          <div className="text-sm text-text-secondary">
            {sortedPositions.length} positions • {formatCurrency(totalMarketValue)} total value
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-surface-hover rounded p-3 text-center">
            <div className="text-text-secondary mb-1 flex items-center justify-center gap-1">
              <Target className="w-3 h-3" />Market Value
            </div>
            <div className="text-text-primary font-semibold">{formatCurrency(totalMarketValue)}</div>
          </div>
          <div className="bg-surface-hover rounded p-3 text-center">
            <div className="text-text-secondary mb-1 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />Unrealized P&L
            </div>
            <div className={`font-semibold ${totalUnrealizedPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
              {formatCurrency(totalUnrealizedPnL)}
            </div>
          </div>
          <div className="bg-surface-hover rounded p-3 text-center">
            <div className="text-text-secondary mb-1 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />Total Return
            </div>
            <div className={`font-semibold ${totalPnLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
              {formatPercentage(totalPnLPercent)}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {/* Table Header */}
        <div className="grid grid-cols-8 gap-2 p-4 bg-surface-hover border-b border-border-primary text-sm font-medium text-text-secondary min-w-[800px]">
          <button
            onClick={() => handleSort('symbol')}
            className="text-left hover:text-text-primary transition-colors flex items-center gap-1"
          >
            <TrendingUp className="w-4 h-4 inline mr-1" />Asset {getSortIcon('symbol')}
          </button>
          <button
            onClick={() => handleSort('quantity')}
            className="text-right hover:text-text-primary transition-colors flex items-center justify-end gap-1"
          >
            <Hash className="w-4 h-4 inline mr-1" />Quantity {getSortIcon('quantity')}
          </button>
          <button
            onClick={() => handleSort('entryPrice')}
            className="text-right hover:text-text-primary transition-colors flex items-center justify-end gap-1"
          >
            <DollarSign className="w-4 h-4 inline mr-1" />Entry Price {getSortIcon('entryPrice')}
          </button>
          <button
            onClick={() => handleSort('currentPrice')}
            className="text-right hover:text-text-primary transition-colors flex items-center justify-end gap-1"
          >
            <DollarSign className="w-4 h-4 inline mr-1" />Current Price {getSortIcon('currentPrice')}
          </button>
          <button
            onClick={() => handleSort('marketValue')}
            className="text-right hover:text-text-primary transition-colors flex items-center justify-end gap-1"
          >
            <Target className="w-4 h-4 inline mr-1" />Market Value {getSortIcon('marketValue')}
          </button>
          <button
            onClick={() => handleSort('unrealizedPnL')}
            className="text-right hover:text-text-primary transition-colors flex items-center justify-end gap-1"
          >
            <TrendingUp className="w-4 h-4 inline mr-1" />P&L {getSortIcon('unrealizedPnL')}
          </button>
          <button
            onClick={() => handleSort('duration')}
            className="text-right hover:text-text-primary transition-colors flex items-center justify-end gap-1"
          >
            <Clock className="w-4 h-4 inline mr-1" />Duration {getSortIcon('duration')}
          </button>
          <div className="text-center">
            Actions
          </div>
        </div>

        {/* Table Body */}
        <div className="max-h-96 overflow-y-auto">
          {sortedPositions.map((position) => (
            <div
              key={position.id}
              className="grid grid-cols-8 gap-2 p-4 border-b border-border-primary hover:bg-surface-hover transition-colors text-sm min-w-[800px]"
            >
              {/* Asset */}
              <div className="flex items-center">
                <div>
                  <div className="font-semibold text-text-primary">
                    {position.symbol}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {position.type.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div className="text-right">
                <div className="font-mono text-text-primary">
                  {position.quantity}
                </div>
              </div>

              {/* Entry Price */}
              <div className="text-right">
                <div className="font-mono text-text-primary">
                  {formatCurrency(position.entryPrice, 'USD', position.entryPrice > 1 ? 2 : 6)}
                </div>
              </div>

              {/* Current Price */}
              <div className="text-right">
                <div className="font-mono text-text-primary">
                  <PriceDisplay
                    symbol={position.symbol}
                    fallbackPrice={position.currentPrice}
                    decimals={position.currentPrice > 1 ? 2 : 6}
                    className="font-mono text-text-primary"
                  />
                </div>
              </div>

              {/* Market Value */}
              <div className="text-right">
                <div className="font-mono text-text-primary font-semibold">
                  <LivePriceValue
                    symbol={position.symbol}
                    quantity={position.quantity}
                    fallbackPrice={position.currentPrice}
                    className="font-mono text-text-primary font-semibold"
                  />
                </div>
              </div>

              {/* P&L */}
              <div className="text-right">
                <LivePnL
                  symbol={position.symbol}
                  quantity={position.quantity}
                  entryPrice={position.entryPrice}
                  fallbackPrice={position.currentPrice}
                  className="font-mono font-semibold"
                />
              </div>

              {/* Duration */}
              <div className="text-right">
                <div className="text-text-secondary font-mono text-xs">
                  {position.duration}
                </div>
              </div>

              {/* Actions */}
              <div className="text-center">
                <button
                  onClick={() => handleClosePosition(position)}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <X className="w-3 h-3 mr-1" /> <p className="text-xs">Close</p>
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 bg-surface-hover text-xs text-text-secondary text-center border-t border-border-primary">
        Real-time position tracking • Updated continuously via WebSocket
      </div>

      {/* Close Position Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!positionToClose}
        onClose={() => setPositionToClose(null)}
        onConfirm={confirmClosePosition}
        title="Close Position"
        message={positionToClose ? `Close position: ${positionToClose.quantity} ${positionToClose.symbol}?` : ''}
        confirmText="Close Position"
        type="warning"
        details={positionToClose ? [
          `Market Value: ${formatCurrency(positionToClose.marketValue)}`,
          `P&L: ${formatCurrency(positionToClose.unrealizedPnL)} (${formatPercentage(positionToClose.unrealizedPnLPercent)})`,
          `Entry Price: ${formatCurrency(positionToClose.entryPrice)}`,
          `Current Price: ${formatCurrency(positionToClose.currentPrice)}`
        ] : []}
      />
    </div>
  );
});

// Live Market Value Component
const LiveMarketValue = React.memo<{
  symbol: string;
  quantity: number;
  fallbackPrice: number;
  className?: string;
}>(({ symbol, quantity, fallbackPrice, className = "font-mono text-text-primary" }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const { getPrice } = usePrices();
  const context = useContext(PriceContext);
  const lastValueRef = useRef<number | null>(null);

  useEffect(() => {
    if (!spanRef.current) return;

    // Set initial value
    const initialPrice = getPrice(symbol) || fallbackPrice;
    const initialValue = quantity * initialPrice;
    updateValueDisplay(initialValue);
    lastValueRef.current = initialValue;

    // Subscribe to price updates
    let unsubscribe: (() => void) | null = null;

    if (context?.subscribe) {
      unsubscribe = context.subscribe((prices: Record<string, number>) => {
        const newPrice = prices[symbol];
        if (newPrice !== undefined) {
          const newValue = quantity * newPrice;
          if (newValue !== lastValueRef.current) {
            updateValueDisplay(newValue);
            lastValueRef.current = newValue;
          }
        }
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [symbol, quantity, fallbackPrice, getPrice, context]);

  const updateValueDisplay = (value: number) => {
    if (!spanRef.current) return;
    spanRef.current.textContent = formatCurrency(value);
  };

  // Initial render
  const initialPrice = fallbackPrice || 0;
  const initialValue = quantity * initialPrice;

  return (
    <span ref={spanRef} className={className}>
      {formatCurrency(initialValue)}
    </span>
  );
});

LiveMarketValue.displayName = 'LiveMarketValue';

// Live P&L Component
const LivePnL = React.memo<{
  symbol: string;
  quantity: number;
  entryPrice: number;
  fallbackPrice: number;
  className?: string;
}>(({ symbol, quantity, entryPrice, fallbackPrice, className = "font-mono" }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const { getPrice } = usePrices();
  const context = useContext(PriceContext);
  const lastPnLRef = useRef<number | null>(null);

  const updatePnLDisplay = useCallback((pnl: number) => {
    if (!spanRef.current) return;

    const pnlPercent = ((pnl / (entryPrice * quantity)) * 100);
    spanRef.current.innerHTML = `
      <div class="${pnl >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(pnl)}</div>
      <div class="text-xs ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}">${formatPercentage(pnlPercent)}</div>
    `;
  }, [entryPrice, quantity]);

  useEffect(() => {
    if (!spanRef.current) return;

    // Set initial P&L
    const initialPrice = getPrice(symbol) || fallbackPrice;
    const initialPnL = (initialPrice - entryPrice) * quantity;
    updatePnLDisplay(initialPnL);
    lastPnLRef.current = initialPnL;

    // Subscribe to price updates
    let unsubscribe: (() => void) | null = null;

    if (context?.subscribe) {
      unsubscribe = context.subscribe((prices: Record<string, number>) => {
        const newPrice = prices[symbol];
        if (newPrice !== undefined) {
          const newPnL = (newPrice - entryPrice) * quantity;
          if (newPnL !== lastPnLRef.current) {
            updatePnLDisplay(newPnL);
            lastPnLRef.current = newPnL;
          }
        }
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [symbol, quantity, entryPrice, fallbackPrice, getPrice, context, updatePnLDisplay]);

  // Initial render
  const initialPrice = fallbackPrice || entryPrice;
  const initialPnL = (initialPrice - entryPrice) * quantity;
  const initialPnLPercent = ((initialPnL / (entryPrice * quantity)) * 100);

  return (
    <span ref={spanRef} className={className}>
      <div className={`${initialPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {formatCurrency(initialPnL)}
      </div>
      <div className={`text-xs ${initialPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {formatPercentage(initialPnLPercent)}
      </div>
    </span>
  );
});

LivePnL.displayName = 'LivePnL';

PositionsTable.displayName = 'PositionsTable';