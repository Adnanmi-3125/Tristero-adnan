import { 
  Position, 
  Transaction, 
  Portfolio, 
  OrderSide, 
  DEFAULT_TRADING_FEE_PERCENT 
} from '@/types/trading';

// ============================================================================
// P&L CALCULATIONS
// ============================================================================

/**
 * Calculate unrealized P&L for a position
 */
export function calculateUnrealizedPnL(
  entryPrice: number,
  currentPrice: number,
  quantity: number,
  side: OrderSide
): { pnl: number; pnlPercent: number } {
  const multiplier = side === 'buy' ? 1 : -1;
  const priceChange = currentPrice - entryPrice;
  const pnl = multiplier * priceChange * quantity;
  const pnlPercent = entryPrice > 0 ? (priceChange / entryPrice) * 100 * multiplier : 0;
  
  return { pnl, pnlPercent };
}

/**
 * Calculate realized P&L from a transaction
 */
export function calculateRealizedPnL(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  side: OrderSide,
  includesFees: boolean = true
): { pnl: number; pnlPercent: number; fees: number } {
  const multiplier = side === 'buy' ? 1 : -1;
  const priceChange = exitPrice - entryPrice;
  const grossPnL = multiplier * priceChange * quantity;
  
  // Calculate fees (entry + exit)
  const fees = includesFees 
    ? (entryPrice * quantity * DEFAULT_TRADING_FEE_PERCENT) + (exitPrice * quantity * DEFAULT_TRADING_FEE_PERCENT)
    : 0;
  
  const netPnL = grossPnL - fees;
  const pnlPercent = entryPrice > 0 ? (netPnL / (entryPrice * quantity)) * 100 : 0;
  
  return { pnl: netPnL, pnlPercent, fees };
}

/**
 * Calculate position value in USD
 */
export function calculatePositionValue(
  quantity: number,
  currentPrice: number
): number {
  return quantity * currentPrice;
}

/**
 * Calculate break-even price for a position including fees
 */
export function calculateBreakEvenPrice(
  entryPrice: number,
  side: OrderSide,
  feePercent: number = DEFAULT_TRADING_FEE_PERCENT
): number {
  const feeMultiplier = side === 'buy' ? (1 + feePercent * 2) : (1 - feePercent * 2);
  return entryPrice * feeMultiplier;
}

// ============================================================================
// PORTFOLIO METRICS
// ============================================================================

/**
 * Calculate total portfolio value
 */
export function calculatePortfolioValue(
  cash: number,
  positions: Position[],
  currentPrices: Record<string, number>
): number {
  const positionsValue = positions.reduce((total, position) => {
    const currentPrice = currentPrices[position.symbol] || position.currentPrice;
    return total + calculatePositionValue(position.quantity, currentPrice);
  }, 0);
  
  return cash + positionsValue;
}

/**
 * Calculate portfolio P&L metrics
 */
export function calculatePortfolioMetrics(
  initialValue: number,
  currentValue: number
): {
  totalPnL: number;
  totalPnLPercent: number;
  totalReturn: number;
} {
  const totalPnL = currentValue - initialValue;
  const totalPnLPercent = initialValue > 0 ? (totalPnL / initialValue) * 100 : 0;
  const totalReturn = totalPnLPercent / 100;
  
  return { totalPnL, totalPnLPercent, totalReturn };
}

/**
 * Calculate portfolio allocation by asset
 */
export function calculatePortfolioAllocation(
  positions: Position[],
  currentPrices: Record<string, number>
): { symbol: string; value: number; percentage: number }[] {
  const totalValue = positions.reduce((total, position) => {
    const currentPrice = currentPrices[position.symbol] || position.currentPrice;
    return total + calculatePositionValue(position.quantity, currentPrice);
  }, 0);
  
  if (totalValue === 0) return [];
  
  return positions.map(position => {
    const currentPrice = currentPrices[position.symbol] || position.currentPrice;
    const value = calculatePositionValue(position.quantity, currentPrice);
    const percentage = (value / totalValue) * 100;
    
    return {
      symbol: position.symbol,
      value,
      percentage,
    };
  });
}

/**
 * Calculate portfolio risk metrics
 */
export function calculateRiskMetrics(
  positions: Position[],
  currentPrices: Record<string, number>,
  portfolio: Portfolio
): {
  totalExposure: number;
  maxPositionRisk: number;
  diversificationScore: number;
  leverageRatio: number;
} {
  if (positions.length === 0) {
    return {
      totalExposure: 0,
      maxPositionRisk: 0,
      diversificationScore: 1,
      leverageRatio: 0,
    };
  }
  
  // Calculate total exposure (sum of all position values)
  const totalExposure = positions.reduce((total, position) => {
    const currentPrice = currentPrices[position.symbol] || position.currentPrice;
    return total + Math.abs(calculatePositionValue(position.quantity, currentPrice));
  }, 0);
  
  // Calculate max single position risk
  const positionValues = positions.map(position => {
    const currentPrice = currentPrices[position.symbol] || position.currentPrice;
    return Math.abs(calculatePositionValue(position.quantity, currentPrice));
  });
  const maxPositionValue = Math.max(...positionValues);
  const maxPositionRisk = totalExposure > 0 ? (maxPositionValue / totalExposure) * 100 : 0;
  
  // Calculate diversification score (1 / number of positions, capped at 1)
  const diversificationScore = Math.min(1, 1 / positions.length);
  
  // Calculate leverage ratio (total exposure / account equity)
  const leverageRatio = portfolio.currentBalance > 0 ? totalExposure / portfolio.currentBalance : 0;
  
  return {
    totalExposure,
    maxPositionRisk,
    diversificationScore,
    leverageRatio,
  };
}

// ============================================================================
// PERFORMANCE ANALYTICS
// ============================================================================

/**
 * Calculate daily P&L from transactions
 */
export function calculateDailyPnL(
  transactions: Transaction[],
  timeframe: number = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
): number {
  const cutoffTime = Date.now() - timeframe;
  const recentTransactions = transactions.filter(tx => tx.timestamp >= cutoffTime);
  
  return recentTransactions.reduce((total, tx) => {
    // For buy orders, subtract cost; for sell orders, add proceeds
    const multiplier = tx.side === 'sell' ? 1 : -1;
    return total + (tx.total * multiplier);
  }, 0);
}

/**
 * Calculate win rate from closed positions (transactions)
 */
export function calculateWinRate(transactions: Transaction[]): {
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWinAmount: number;
  avgLossAmount: number;
} {
  // Group transactions by symbol to identify complete trades
  const tradeGroups: Record<string, Transaction[]> = {};
  
  transactions.forEach(tx => {
    if (!tradeGroups[tx.symbol]) {
      tradeGroups[tx.symbol] = [];
    }
    tradeGroups[tx.symbol].push(tx);
  });
  
  let winningTrades = 0;
  let losingTrades = 0;
  let totalWinAmount = 0;
  let totalLossAmount = 0;
  
  // Analyze each symbol's transactions to determine wins/losses
  Object.values(tradeGroups).forEach(symbolTrades => {
    let position = 0;
    let cost = 0;
    
    symbolTrades.sort((a, b) => a.timestamp - b.timestamp);
    
    symbolTrades.forEach(trade => {
      if (trade.side === 'buy') {
        cost += trade.total;
        position += trade.quantity;
      } else {
        // Partial or full sell
        const sellQuantity = Math.min(trade.quantity, position);
        if (sellQuantity > 0) {
          const avgCost = cost / position;
          const proceeds = sellQuantity * trade.price - trade.fee;
          const costBasis = sellQuantity * avgCost;
          const pnl = proceeds - costBasis;
          
          if (pnl > 0) {
            winningTrades++;
            totalWinAmount += pnl;
          } else if (pnl < 0) {
            losingTrades++;
            totalLossAmount += Math.abs(pnl);
          }
          
          // Update remaining position
          position -= sellQuantity;
          cost -= costBasis;
        }
      }
    });
  });
  
  const totalTrades = winningTrades + losingTrades;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const avgWinAmount = winningTrades > 0 ? totalWinAmount / winningTrades : 0;
  const avgLossAmount = losingTrades > 0 ? totalLossAmount / losingTrades : 0;
  
  return {
    winRate,
    totalTrades,
    winningTrades,
    losingTrades,
    avgWinAmount,
    avgLossAmount,
  };
}

/**
 * Calculate Sharpe ratio approximation
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02 // 2% annual risk-free rate
): number {
  if (returns.length < 2) return 0;
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  // Convert annual risk-free rate to period rate
  const periodRiskFreeRate = riskFreeRate / returns.length;
  
  return (avgReturn - periodRiskFreeRate) / stdDev;
}

/**
 * Calculate maximum drawdown
 */
export function calculateMaxDrawdown(portfolioValues: number[]): {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  peakValue: number;
  troughValue: number;
} {
  if (portfolioValues.length === 0) {
    return { maxDrawdown: 0, maxDrawdownPercent: 0, peakValue: 0, troughValue: 0 };
  }
  
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let peakValue = portfolioValues[0];
  let troughValue = portfolioValues[0];
  let currentPeak = portfolioValues[0];
  
  portfolioValues.forEach(value => {
    if (value > currentPeak) {
      currentPeak = value;
    }
    
    const drawdown = currentPeak - value;
    const drawdownPercent = currentPeak > 0 ? (drawdown / currentPeak) * 100 : 0;
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
      peakValue = currentPeak;
      troughValue = value;
    }
  });
  
  return { maxDrawdown, maxDrawdownPercent, peakValue, troughValue };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency values
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  decimals: number = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage values
 */
export function formatPercentage(
  value: number,
  decimals: number = 2,
  includeSign: boolean = true
): string {
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  oldValue: number,
  newValue: number
): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Calculate compound annual growth rate (CAGR)
 */
export function calculateCAGR(
  initialValue: number,
  finalValue: number,
  years: number
): number {
  if (initialValue <= 0 || finalValue <= 0 || years <= 0) return 0;
  return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
}

/**
 * Calculate position sizing based on risk management
 */
export function calculatePositionSize(
  accountBalance: number,
  entryPrice: number,
  stopLossPrice: number,
  riskPercentage: number = 1 // 1% risk per trade
): {
  maxQuantity: number;
  riskAmount: number;
  stopLossDistance: number;
} {
  const riskAmount = accountBalance * (riskPercentage / 100);
  const stopLossDistance = Math.abs(entryPrice - stopLossPrice);
  
  const maxQuantity = stopLossDistance > 0 ? riskAmount / stopLossDistance : 0;
  
  return {
    maxQuantity,
    riskAmount,
    stopLossDistance,
  };
}

/**
 * Check if price is within acceptable slippage
 */
export function checkSlippage(
  expectedPrice: number,
  actualPrice: number,
  maxSlippagePercent: number = 0.5
): {
  isAcceptable: boolean;
  slippagePercent: number;
  slippageAmount: number;
} {
  const slippageAmount = Math.abs(actualPrice - expectedPrice);
  const slippagePercent = expectedPrice > 0 ? (slippageAmount / expectedPrice) * 100 : 0;
  const isAcceptable = slippagePercent <= maxSlippagePercent;
  
  return {
    isAcceptable,
    slippagePercent,
    slippageAmount,
  };
}