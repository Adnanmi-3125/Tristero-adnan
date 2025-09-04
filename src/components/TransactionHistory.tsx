import React, { useState, useMemo, useEffect, useRef, useContext } from 'react';
import { ChevronUp, ChevronDown, Calendar, TrendingUp, TrendingDown, Hash, DollarSign, Target, Search } from 'lucide-react';
import { usePortfolioStore } from '@/state/portfolioStore';
import { usePrices } from '@/hooks/usePriceContext';
import { PriceContext } from '@/context/PriceContext';
import { Dropdown } from '@/components/ui/Dropdown';
import { formatCurrency, formatPercentage } from '@/utils/calculations';
import { LivePriceValue } from '@/components/LivePriceValue';
import type { Transaction } from '@/state/portfolioStore';

interface TransactionWithMetrics extends Transaction {
  currentPrice?: number;
  currentValue?: number;
  realizedPnL?: number;
  realizedPnLPercent?: number;
  total: number; // Add missing property
}

type SortField = keyof TransactionWithMetrics;
type FilterType = 'all' | 'buy' | 'sell';

export const TransactionHistory = React.memo(() => {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [, forceUpdate] = useState({});

  const { getActivePortfolio } = usePortfolioStore();
  const { getPrice, subscribe } = usePrices();

  const activePortfolio = getActivePortfolio();

  // Force re-render when prices update
  useEffect(() => {
    if (!subscribe) return;

    const unsubscribe = subscribe(() => {
      forceUpdate({});
    });

    return unsubscribe;
  }, [subscribe]);

  // Process transactions with current market data
  const transactionsWithMetrics = useMemo((): TransactionWithMetrics[] => {
    if (!activePortfolio?.transactions?.length) return [];

    return activePortfolio.transactions.map(transaction => {
      const currentPrice = getPrice(transaction.symbol);
      const total = transaction.quantity * transaction.price;
      const metrics: TransactionWithMetrics = {
        ...transaction,
        total
      };

      if (currentPrice && transaction.type === 'buy') {
        // For buy transactions, show what the position would be worth now
        metrics.currentPrice = currentPrice;
        metrics.currentValue = transaction.quantity * currentPrice;
        metrics.realizedPnL = metrics.currentValue - total;
        metrics.realizedPnLPercent = (metrics.realizedPnL / total) * 100;
      } else if (transaction.type === 'sell') {
        metrics.realizedPnL = 0;
      }

      return metrics;
    });
  }, [activePortfolio?.transactions, getPrice]);

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactionsWithMetrics;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.type === filterType);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.symbol.toLowerCase().includes(term) ||
        tx.type.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [transactionsWithMetrics, filterType, searchTerm]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === undefined || bValue === undefined) return 0;

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      // Handle number sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [filteredTransactions, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeColor = (type: string) => {
    return type === 'buy' ? 'text-green-400' : 'text-red-400';
  };

  const getTypeIcon = (type: string) => {
    return type === 'buy' ? '📈' : '📉';
  };

  // Calculate summary stats
  const totalTransactions = sortedTransactions.length;
  const buyTransactions = sortedTransactions.filter(tx => tx.type === 'buy').length;
  const sellTransactions = sortedTransactions.filter(tx => tx.type === 'sell').length;
  const totalVolume = sortedTransactions.reduce((sum, tx) => sum + tx.total, 0);

  if (!activePortfolio) {
    return (
      <div className="bg-surface border border-border-primary rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold mb-2 text-text-primary">No Portfolio Selected</h3>
        <p className="text-text-secondary">
          Please select a portfolio to view transaction history
        </p>
      </div>
    );
  }

  // Show empty state only if there are no transactions at all (not due to filtering)
  if (!transactionsWithMetrics.length) {
    return (
      <div className="bg-surface border border-border-primary rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-xl font-semibold mb-2 text-text-primary">No Transactions Yet</h3>
        <p className="text-text-secondary">
          Start trading to see your transaction history here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-primary rounded-lg">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 sm:gap-0">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">Transaction History</h2>
          <div className="text-xs sm:text-sm text-text-secondary break-words">
            {totalTransactions} transactions • {formatCurrency(totalVolume)} total volume
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm mb-4">
          <div className="bg-surface-hover rounded p-2 sm:p-3 text-center">
            <div className="text-text-secondary mb-1 flex items-center justify-center gap-1">
              <Hash className="w-3 h-3" /><span className="hidden sm:inline">Total Trades</span><span className="sm:hidden">Trades</span>
            </div>
            <div className="text-text-primary font-semibold text-sm sm:text-base">{totalTransactions}</div>
          </div>
          <div className="bg-surface-hover rounded p-2 sm:p-3 text-center">
            <div className="text-text-secondary mb-1 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /><span className="hidden sm:inline">Buy Orders</span><span className="sm:hidden">Buys</span>
            </div>
            <div className="text-profit font-semibold text-sm sm:text-base">{buyTransactions}</div>
          </div>
          <div className="bg-surface-hover rounded p-2 sm:p-3 text-center">
            <div className="text-text-secondary mb-1 flex items-center justify-center gap-1">
              <TrendingDown className="w-3 h-3" /><span className="hidden sm:inline">Sell Orders</span><span className="sm:hidden">Sells</span>
            </div>
            <div className="text-loss font-semibold text-sm sm:text-base">{sellTransactions}</div>
          </div>
          <div className="bg-surface-hover rounded p-2 sm:p-3 text-center col-span-2 sm:col-span-1">
            <div className="text-text-secondary mb-1 flex items-center justify-center gap-1">
              <DollarSign className="w-3 h-3" /><span className="hidden sm:inline">Total Volume</span><span className="sm:hidden">Volume</span>
            </div>
            <div className="text-text-primary font-semibold text-sm sm:text-base break-all">{formatCurrency(totalVolume)}</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border-primary rounded px-10 py-2 text-text-primary text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <div className="min-w-[140px]">
            <Dropdown
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'buy', label: 'Buy Only' },
                { value: 'sell', label: 'Sell Only' }
              ]}
              value={filterType}
              onChange={(value) => setFilterType(value as FilterType)}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover">
            <tr>
              <th
                className="text-left p-2 sm:p-3 text-text-secondary cursor-pointer hover:bg-surface-hover text-xs sm:text-sm"
                onClick={() => handleSort('timestamp')}
              >
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Date</span>
                  <span className="ml-1">{getSortIcon('timestamp')}</span>
                </div>
              </th>
              <th
                className="text-left p-2 sm:p-3 text-text-secondary cursor-pointer hover:bg-surface-hover text-xs sm:text-sm"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Type</span>
                  <span className="ml-1">{getSortIcon('type')}</span>
                </div>
              </th>
              <th
                className="text-left p-2 sm:p-3 text-text-secondary cursor-pointer hover:bg-surface-hover text-xs sm:text-sm"
                onClick={() => handleSort('symbol')}
              >
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Asset</span>
                  <span className="ml-1">{getSortIcon('symbol')}</span>
                </div>
              </th>
              <th
                className="text-right p-2 sm:p-3 text-text-secondary cursor-pointer hover:bg-surface-hover text-xs sm:text-sm"
                onClick={() => handleSort('quantity')}
              >
                <div className="flex items-center justify-end gap-1">
                  <Hash className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Quantity</span>
                  <span className="ml-1">{getSortIcon('quantity')}</span>
                </div>
              </th>
              <th
                className="text-right p-2 sm:p-3 text-text-secondary cursor-pointer hover:bg-surface-hover text-xs sm:text-sm"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Price</span>
                  <span className="ml-1">{getSortIcon('price')}</span>
                </div>
              </th>
              <th
                className="text-right p-2 sm:p-3 text-text-secondary cursor-pointer hover:bg-surface-hover text-xs sm:text-sm"
                onClick={() => handleSort('total')}
              >
                <div className="flex items-center justify-end gap-1">
                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Total</span>
                  <span className="ml-1">{getSortIcon('total')}</span>
                </div>
              </th>
              <th className="text-right p-2 sm:p-3 text-text-secondary text-xs sm:text-sm">
                Current Value
              </th>
              <th className="text-right p-2 sm:p-3 text-text-secondary text-xs sm:text-sm">
                P&L
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold mb-2 text-text-primary">No Matching Transactions</h3>
                  <p className="text-text-secondary">
                    {filterType === 'buy' && 'No buy orders found. '}
                    {filterType === 'sell' && 'No sell orders found. '}
                    {searchTerm && `No transactions match "${searchTerm}". `}
                    Try adjusting your filters above.
                  </p>
                </td>
              </tr>
            ) : (
              sortedTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-t border-border-primary hover:bg-surface-hover">
                  <td className="p-3 text-text-primary">
                    {formatDate(transaction.timestamp)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span>{getTypeIcon(transaction.type)}</span>
                      <span className={`font-semibold ${getTypeColor(transaction.type)}`}>
                        {transaction.type.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-text-primary font-semibold">
                    {transaction.symbol}
                  </td>
                  <td className="p-3 text-right text-text-primary">
                    {transaction.quantity.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-text-primary">
                    {formatCurrency(transaction.price)}
                  </td>
                  <td className="p-3 text-right text-text-primary font-semibold">
                    {formatCurrency(transaction.total)}
                  </td>
                  <td className="p-3 text-right text-text-primary">
                    {transaction.type === 'buy' ? (
                      <LivePriceValue
                        symbol={transaction.symbol}
                        quantity={transaction.quantity}
                        fallbackPrice={transaction.price}
                        className="font-mono text-text-primary"
                      />
                    ) : '-'}
                  </td>
                  <td className="p-3 text-right">
                    {transaction.type === 'buy' ? (
                      <LiveTransactionPnL
                        symbol={transaction.symbol}
                        quantity={transaction.quantity}
                        entryPrice={transaction.price}
                        fallbackCurrentPrice={transaction.currentPrice || transaction.price}
                      />
                    ) : (
                      <span className="text-text-secondary">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border-primary text-center text-sm text-text-secondary">
        Showing {sortedTransactions.length} of {totalTransactions} transactions
      </div>
    </div>
  );
});

// Live Transaction P&L Component
const LiveTransactionPnL = React.memo<{
  symbol: string;
  quantity: number;
  entryPrice: number;
  fallbackCurrentPrice: number;
}>(({ symbol, quantity, entryPrice, fallbackCurrentPrice }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const { getPrice } = usePrices();
  const context = useContext(PriceContext);
  const lastPnLRef = useRef<number | null>(null);

  useEffect(() => {
    if (!spanRef.current) return;

    // Set initial P&L
    const initialPrice = getPrice(symbol) || fallbackCurrentPrice;
    const costBasis = quantity * entryPrice;
    const currentValue = quantity * initialPrice;
    const initialPnL = currentValue - costBasis;
    const initialPnLPercent = (initialPnL / costBasis) * 100;

    updatePnLDisplay(initialPnL, initialPnLPercent);
    lastPnLRef.current = initialPnL;

    // Subscribe to price updates
    let unsubscribe: (() => void) | null = null;

    if (context?.subscribe) {
      unsubscribe = context.subscribe((prices: Record<string, number>) => {
        const newPrice = prices[symbol];
        if (newPrice !== undefined) {
          const newCurrentValue = quantity * newPrice;
          const newPnL = newCurrentValue - costBasis;
          const newPnLPercent = (newPnL / costBasis) * 100;

          if (newPnL !== lastPnLRef.current) {
            updatePnLDisplay(newPnL, newPnLPercent);
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
  }, [symbol, quantity, entryPrice, fallbackCurrentPrice, getPrice, context]);

  const updatePnLDisplay = (pnl: number, pnlPercent: number) => {
    if (!spanRef.current) return;

    const colorClass = pnl >= 0 ? 'text-green-400' : 'text-red-400';
    spanRef.current.innerHTML = `
      <div class="font-semibold ${colorClass}">${formatCurrency(pnl)}</div>
      <div class="text-xs ${colorClass}">${formatPercentage(pnlPercent)}</div>
    `;
  };

  // Initial render
  const initialPrice = fallbackCurrentPrice || entryPrice;
  const costBasis = quantity * entryPrice;
  const currentValue = quantity * initialPrice;
  const initialPnL = currentValue - costBasis;
  const initialPnLPercent = (initialPnL / costBasis) * 100;
  const colorClass = initialPnL >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <span ref={spanRef}>
      <div className={`font-semibold ${colorClass}`}>{formatCurrency(initialPnL)}</div>
      <div className={`text-xs ${colorClass}`}>{formatPercentage(initialPnLPercent)}</div>
    </span>
  );
});

LiveTransactionPnL.displayName = 'LiveTransactionPnL';

TransactionHistory.displayName = 'TransactionHistory';