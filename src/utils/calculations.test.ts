import { describe, it, expect } from 'vitest';
import {
  calculateUnrealizedPnL,
  calculateRealizedPnL,
  calculatePositionValue,
  calculateBreakEvenPrice,
  calculatePortfolioValue,
  calculatePortfolioMetrics,
  calculatePortfolioAllocation,
  calculateRiskMetrics,
  calculateDailyPnL,
  calculateWinRate,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  formatCurrency,
  formatPercentage,
  calculatePercentageChange,
  calculateCAGR,
  calculatePositionSize,
  checkSlippage,
} from './calculations';
import { Position, Transaction, Portfolio } from '@/types/trading';

describe('P&L Calculations', () => {
  describe('calculateUnrealizedPnL', () => {
    it('should calculate profit for long position', () => {
      const result = calculateUnrealizedPnL(100, 110, 10, 'buy');
      expect(result.pnl).toBe(100); // (110 - 100) * 10
      expect(result.pnlPercent).toBe(10); // 10% gain
    });

    it('should calculate loss for long position', () => {
      const result = calculateUnrealizedPnL(100, 90, 10, 'buy');
      expect(result.pnl).toBe(-100); // (90 - 100) * 10
      expect(result.pnlPercent).toBe(-10); // 10% loss
    });

    it('should calculate profit for short position', () => {
      const result = calculateUnrealizedPnL(100, 90, 10, 'sell');
      expect(result.pnl).toBe(100); // (100 - 90) * 10 (inverse for short)
      expect(result.pnlPercent).toBe(10); // 10% gain
    });

    it('should handle zero entry price', () => {
      const result = calculateUnrealizedPnL(0, 100, 10, 'buy');
      expect(result.pnl).toBe(1000);
      expect(result.pnlPercent).toBe(0);
    });
  });

  describe('calculateRealizedPnL', () => {
    it('should calculate realized P&L with fees', () => {
      const result = calculateRealizedPnL(100, 110, 10, 'buy', true);
      expect(result.pnl).toBeCloseTo(97.9, 1); // 100 profit - 2.1 fees (0.1% * 100 * 10 + 0.1% * 110 * 10)
      expect(result.fees).toBe(2.1); // 1 + 1.1
      expect(result.pnlPercent).toBeCloseTo(9.79, 1); // 97.9 / 1000 * 100
    });

    it('should calculate realized P&L without fees', () => {
      const result = calculateRealizedPnL(100, 110, 10, 'buy', false);
      expect(result.pnl).toBe(100);
      expect(result.fees).toBe(0);
      expect(result.pnlPercent).toBe(10);
    });
  });

  describe('calculatePositionValue', () => {
    it('should calculate position value correctly', () => {
      expect(calculatePositionValue(10, 50.5)).toBe(505);
    });

    it('should handle zero values', () => {
      expect(calculatePositionValue(0, 100)).toBe(0);
      expect(calculatePositionValue(10, 0)).toBe(0);
    });
  });

  describe('calculateBreakEvenPrice', () => {
    it('should calculate break-even price for long position', () => {
      const breakEven = calculateBreakEvenPrice(100, 'buy', 0.001);
      expect(breakEven).toBe(100.2); // 100 * (1 + 0.001 * 2)
    });

    it('should calculate break-even price for short position', () => {
      const breakEven = calculateBreakEvenPrice(100, 'sell', 0.001);
      expect(breakEven).toBe(99.8); // 100 * (1 - 0.001 * 2)
    });
  });
});

describe('Portfolio Metrics', () => {
  const mockPositions: Position[] = [
    {
      id: 'pos1',
      portfolioId: 'portfolio1',
      symbol: 'BTC',
      side: 'buy',
      quantity: 1,
      entryPrice: 50000,
      currentPrice: 55000,
      unrealizedPnL: 5000,
      unrealizedPnLPercent: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'pos2',
      portfolioId: 'portfolio1',
      symbol: 'ETH',
      side: 'buy',
      quantity: 10,
      entryPrice: 3000,
      currentPrice: 3200,
      unrealizedPnL: 2000,
      unrealizedPnLPercent: 6.67,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const mockCurrentPrices = {
    'BTC': 55000,
    'ETH': 3200,
  };

  const mockPortfolio: Portfolio = {
    id: 'portfolio1',
    name: 'Test Portfolio',
    initialBalance: 100000,
    currentBalance: 15000, // 100k - 85k invested
    totalValue: 102000, // 15k cash + 87k positions
    totalPnL: 2000,
    totalPnLPercent: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  describe('calculatePortfolioValue', () => {
    it('should calculate total portfolio value', () => {
      const value = calculatePortfolioValue(15000, mockPositions, mockCurrentPrices);
      expect(value).toBe(102000); // 15000 cash + 55000 BTC + 32000 ETH
    });
  });

  describe('calculatePortfolioMetrics', () => {
    it('should calculate portfolio metrics correctly', () => {
      const metrics = calculatePortfolioMetrics(100000, 102000);
      expect(metrics.totalPnL).toBe(2000);
      expect(metrics.totalPnLPercent).toBe(2);
      expect(metrics.totalReturn).toBe(0.02);
    });

    it('should handle zero initial value', () => {
      const metrics = calculatePortfolioMetrics(0, 1000);
      expect(metrics.totalPnL).toBe(1000);
      expect(metrics.totalPnLPercent).toBe(0);
    });
  });

  describe('calculatePortfolioAllocation', () => {
    it('should calculate allocation percentages', () => {
      const allocation = calculatePortfolioAllocation(mockPositions, mockCurrentPrices);
      
      expect(allocation).toHaveLength(2);
      expect(allocation[0]).toMatchObject({
        symbol: 'BTC',
        value: 55000,
        percentage: expect.closeTo(63.22, 1), // 55000 / 87000 * 100
      });
      expect(allocation[1]).toMatchObject({
        symbol: 'ETH',
        value: 32000,
        percentage: expect.closeTo(36.78, 1), // 32000 / 87000 * 100
      });
    });

    it('should return empty array for no positions', () => {
      const allocation = calculatePortfolioAllocation([], {});
      expect(allocation).toEqual([]);
    });
  });

  describe('calculateRiskMetrics', () => {
    it('should calculate risk metrics correctly', () => {
      const metrics = calculateRiskMetrics(mockPositions, mockCurrentPrices, mockPortfolio);
      
      expect(metrics.totalExposure).toBe(87000); // 55000 + 32000
      expect(metrics.maxPositionRisk).toBeCloseTo(63.22, 1); // 55000 / 87000 * 100
      expect(metrics.diversificationScore).toBe(0.5); // 1 / 2 positions
      expect(metrics.leverageRatio).toBeCloseTo(5.8, 1); // 87000 / 15000
    });

    it('should handle empty positions', () => {
      const metrics = calculateRiskMetrics([], {}, mockPortfolio);
      expect(metrics).toEqual({
        totalExposure: 0,
        maxPositionRisk: 0,
        diversificationScore: 1,
        leverageRatio: 0,
      });
    });
  });
});

describe('Performance Analytics', () => {
  const mockTransactions: Transaction[] = [
    {
      id: 'tx1',
      portfolioId: 'portfolio1',
      symbol: 'BTC',
      side: 'buy',
      quantity: 1,
      price: 50000,
      fee: 50,
      total: 50050,
      timestamp: Date.now() - 1000,
    },
    {
      id: 'tx2',
      portfolioId: 'portfolio1',
      symbol: 'BTC',
      side: 'sell',
      quantity: 1,
      price: 55000,
      fee: 55,
      total: 54945,
      timestamp: Date.now(),
    },
  ];

  describe('calculateDailyPnL', () => {
    it('should calculate daily P&L from transactions', () => {
      const dailyPnL = calculateDailyPnL(mockTransactions);
      expect(dailyPnL).toBe(4895); // 54945 (sell) - 50050 (buy)
    });

    it('should filter by timeframe', () => {
      const oldTransaction = {
        ...mockTransactions[0],
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };
      
      const dailyPnL = calculateDailyPnL([oldTransaction, mockTransactions[1]]);
      expect(dailyPnL).toBe(54945); // Only the sell transaction
    });
  });

  describe('calculateWinRate', () => {
    it('should calculate win rate for complete trades', () => {
      const winRate = calculateWinRate(mockTransactions);
      
      expect(winRate.totalTrades).toBe(1);
      expect(winRate.winningTrades).toBe(1);
      expect(winRate.losingTrades).toBe(0);
      expect(winRate.winRate).toBe(100);
      expect(winRate.avgWinAmount).toBeGreaterThan(0);
    });

    it('should handle empty transactions', () => {
      const winRate = calculateWinRate([]);
      expect(winRate.totalTrades).toBe(0);
      expect(winRate.winRate).toBe(0);
    });
  });

  describe('calculateSharpeRatio', () => {
    it('should calculate Sharpe ratio', () => {
      const returns = [0.05, -0.02, 0.03, 0.01, -0.01];
      const sharpe = calculateSharpeRatio(returns, 0.02);
      expect(typeof sharpe).toBe('number');
      expect(sharpe).not.toBe(0);
    });

    it('should return 0 for insufficient data', () => {
      expect(calculateSharpeRatio([0.05])).toBe(0);
      expect(calculateSharpeRatio([])).toBe(0);
    });

    it('should handle zero volatility', () => {
      const returns = [0.05, 0.05, 0.05, 0.05];
      const sharpe = calculateSharpeRatio(returns);
      expect(sharpe).toBe(0);
    });
  });

  describe('calculateMaxDrawdown', () => {
    it('should calculate maximum drawdown', () => {
      const portfolioValues = [10000, 12000, 11000, 13000, 9000, 11000];
      const drawdown = calculateMaxDrawdown(portfolioValues);
      
      expect(drawdown.maxDrawdown).toBe(4000); // 13000 - 9000
      expect(drawdown.maxDrawdownPercent).toBeCloseTo(30.77, 1); // 4000 / 13000 * 100
      expect(drawdown.peakValue).toBe(13000);
      expect(drawdown.troughValue).toBe(9000);
    });

    it('should handle empty portfolio values', () => {
      const drawdown = calculateMaxDrawdown([]);
      expect(drawdown).toEqual({
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        peakValue: 0,
        troughValue: 0,
      });
    });

    it('should handle always increasing values', () => {
      const portfolioValues = [1000, 1100, 1200, 1300];
      const drawdown = calculateMaxDrawdown(portfolioValues);
      
      expect(drawdown.maxDrawdown).toBe(0);
      expect(drawdown.maxDrawdownPercent).toBe(0);
    });
  });
});

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1234.56789, 'USD', 4)).toBe('$1,234.5679');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with sign', () => {
      expect(formatPercentage(5.123)).toBe('+5.12%');
      expect(formatPercentage(-5.123)).toBe('-5.12%');
      expect(formatPercentage(0)).toBe('0.00%');
    });

    it('should format percentage without sign', () => {
      expect(formatPercentage(5.123, 2, false)).toBe('5.12%');
      expect(formatPercentage(-5.123, 2, false)).toBe('-5.12%');
    });
  });

  describe('calculatePercentageChange', () => {
    it('should calculate percentage change correctly', () => {
      expect(calculatePercentageChange(100, 110)).toBe(10);
      expect(calculatePercentageChange(100, 90)).toBe(-10);
      expect(calculatePercentageChange(-100, -90)).toBe(10); // (-90 - (-100)) / |-100| * 100 = 10 / 100 * 100 = 10
    });

    it('should handle zero old value', () => {
      expect(calculatePercentageChange(0, 100)).toBe(0);
    });
  });

  describe('calculateCAGR', () => {
    it('should calculate CAGR correctly', () => {
      const cagr = calculateCAGR(100000, 121000, 2);
      expect(cagr).toBeCloseTo(10, 1); // ~10% annual growth
    });

    it('should handle invalid inputs', () => {
      expect(calculateCAGR(0, 100, 1)).toBe(0);
      expect(calculateCAGR(100, 0, 1)).toBe(0);
      expect(calculateCAGR(100, 200, 0)).toBe(0);
    });
  });

  describe('calculatePositionSize', () => {
    it('should calculate position size based on risk', () => {
      const result = calculatePositionSize(10000, 100, 95, 2);
      
      expect(result.riskAmount).toBe(200); // 10000 * 0.02
      expect(result.stopLossDistance).toBe(5); // |100 - 95|
      expect(result.maxQuantity).toBe(40); // 200 / 5
    });

    it('should handle zero stop loss distance', () => {
      const result = calculatePositionSize(10000, 100, 100, 2);
      expect(result.maxQuantity).toBe(0);
    });
  });

  describe('checkSlippage', () => {
    it('should check acceptable slippage', () => {
      const result = checkSlippage(100, 100.3, 0.5);
      
      expect(result.isAcceptable).toBe(true);
      expect(result.slippagePercent).toBeCloseTo(0.3, 1);
      expect(result.slippageAmount).toBeCloseTo(0.3, 1);
    });

    it('should check unacceptable slippage', () => {
      const result = checkSlippage(100, 101, 0.5);
      
      expect(result.isAcceptable).toBe(false);
      expect(result.slippagePercent).toBe(1);
      expect(result.slippageAmount).toBe(1);
    });

    it('should handle zero expected price', () => {
      const result = checkSlippage(0, 1, 0.5);
      expect(result.slippagePercent).toBe(0);
    });
  });
});