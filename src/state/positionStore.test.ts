import { describe, it, expect, beforeEach } from 'vitest';
import { usePositionStore } from './positionStore';

// Helper to reset store before each test
beforeEach(() => {
  usePositionStore.getState().resetAllData();
});

describe('Position Store', () => {
  const mockPortfolioId = 'test-portfolio-1';

  describe('Initial State', () => {
    it('should have empty initial state', () => {
      const state = usePositionStore.getState();
      expect(state.positions).toEqual([]);
      expect(state.transactions).toEqual([]);
      expect(state.orders).toEqual([]);
    });
  });

  describe('Position Management', () => {
    it('should add position', () => {
      const { addPosition } = usePositionStore.getState();
      
      const positionId = addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        entryPrice: 50000,
        currentPrice: 50000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      const state = usePositionStore.getState();
      expect(state.positions).toHaveLength(1);
      expect(state.positions[0].id).toBe(positionId);
      expect(state.positions[0].symbol).toBe('BTC');
    });

    it('should update position', () => {
      const { addPosition, updatePosition } = usePositionStore.getState();
      
      const positionId = addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        entryPrice: 50000,
        currentPrice: 50000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      updatePosition(positionId, { currentPrice: 55000, unrealizedPnL: 5000 });
      
      const state = usePositionStore.getState();
      const position = state.positions.find(p => p.id === positionId);
      expect(position?.currentPrice).toBe(55000);
      expect(position?.unrealizedPnL).toBe(5000);
    });

    it('should close position', () => {
      const { addPosition, closePosition } = usePositionStore.getState();
      
      const positionId = addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        entryPrice: 50000,
        currentPrice: 50000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      closePosition(positionId, 55000);
      
      const state = usePositionStore.getState();
      expect(state.positions).toHaveLength(0);
      expect(state.transactions).toHaveLength(1); // Should create closing transaction
      expect(state.transactions[0].side).toBe('sell');
      expect(state.transactions[0].quantity).toBe(1);
    });

    it('should update position prices', () => {
      const { addPosition, updatePositionPrices } = usePositionStore.getState();
      
      addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        entryPrice: 50000,
        currentPrice: 50000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'ETH',
        side: 'buy',
        quantity: 10,
        entryPrice: 3000,
        currentPrice: 3000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      updatePositionPrices({ BTC: 55000, ETH: 3200 });
      
      const state = usePositionStore.getState();
      const btcPosition = state.positions.find(p => p.symbol === 'BTC');
      const ethPosition = state.positions.find(p => p.symbol === 'ETH');
      
      expect(btcPosition?.currentPrice).toBe(55000);
      expect(btcPosition?.unrealizedPnL).toBe(5000); // (55000 - 50000) * 1
      expect(ethPosition?.currentPrice).toBe(3200);
      expect(ethPosition?.unrealizedPnL).toBe(2000); // (3200 - 3000) * 10
    });
  });

  describe('Transaction Management', () => {
    it('should add transaction', () => {
      const { addTransaction } = usePositionStore.getState();
      
      const transactionId = addTransaction({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        price: 50000,
        fee: 50,
        total: 50050,
        timestamp: Date.now(),
      });
      
      const state = usePositionStore.getState();
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].id).toBe(transactionId);
      expect(state.transactions[0].symbol).toBe('BTC');
    });

    it('should get transactions by portfolio', () => {
      const { addTransaction, getTransactionsByPortfolio } = usePositionStore.getState();
      
      // Add transaction for test portfolio
      addTransaction({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        price: 50000,
        fee: 50,
        total: 50050,
        timestamp: Date.now(),
      });
      
      // Add transaction for different portfolio
      addTransaction({
        portfolioId: 'other-portfolio',
        symbol: 'ETH',
        side: 'buy',
        quantity: 1,
        price: 3000,
        fee: 30,
        total: 3030,
        timestamp: Date.now(),
      });
      
      const transactions = getTransactionsByPortfolio(mockPortfolioId);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].portfolioId).toBe(mockPortfolioId);
    });
  });

  describe('Order Management', () => {
    it('should add order', () => {
      const { addOrder } = usePositionStore.getState();
      
      const orderId = addOrder({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        type: 'market',
        quantity: 1,
        price: 50000,
      });
      
      const state = usePositionStore.getState();
      expect(state.orders).toHaveLength(1);
      expect(state.orders[0].id).toBe(orderId);
      expect(state.orders[0].status).toBe('pending');
    });

    it('should update order', () => {
      const { addOrder, updateOrder } = usePositionStore.getState();
      
      const orderId = addOrder({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        type: 'limit',
        quantity: 1,
        price: 49000,
      });
      
      updateOrder(orderId, { price: 48000 });
      
      const state = usePositionStore.getState();
      const order = state.orders.find(o => o.id === orderId);
      expect(order?.price).toBe(48000);
    });

    it('should cancel order', () => {
      const { addOrder, cancelOrder } = usePositionStore.getState();
      
      const orderId = addOrder({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        type: 'limit',
        quantity: 1,
        price: 49000,
      });
      
      cancelOrder(orderId);
      
      const state = usePositionStore.getState();
      const order = state.orders.find(o => o.id === orderId);
      expect(order?.status).toBe('cancelled');
    });
  });

  describe('Trading Execution', () => {
    it('should execute new buy trade', () => {
      const { executeTrade } = usePositionStore.getState();
      
      const result = executeTrade(mockPortfolioId, 'BTC', 'buy', 1, 50000, 'market');
      
      expect(result.success).toBe(true);
      expect(result.positionId).toBeDefined();
      expect(result.transactionId).toBeDefined();
      
      const state = usePositionStore.getState();
      expect(state.positions).toHaveLength(1);
      expect(state.transactions).toHaveLength(1);
      
      const position = state.positions[0];
      expect(position.symbol).toBe('BTC');
      expect(position.side).toBe('buy');
      expect(position.quantity).toBe(1);
      expect(position.entryPrice).toBe(50000);
    });

    it('should add to existing position (same side)', () => {
      const { addPosition, executeTrade } = usePositionStore.getState();
      
      // Add initial position
      addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        entryPrice: 50000,
        currentPrice: 50000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      // Execute additional buy
      const result = executeTrade(mockPortfolioId, 'BTC', 'buy', 1, 52000, 'market');
      
      expect(result.success).toBe(true);
      
      const state = usePositionStore.getState();
      expect(state.positions).toHaveLength(1); // Still one position
      
      const position = state.positions[0];
      expect(position.quantity).toBe(2);
      expect(position.entryPrice).toBe(51000); // Average price (50000 + 52000) / 2
    });

    it('should reduce position (opposite side)', () => {
      const { addPosition, executeTrade } = usePositionStore.getState();
      
      // Add initial position
      addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 2,
        entryPrice: 50000,
        currentPrice: 50000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      // Execute partial sell
      const result = executeTrade(mockPortfolioId, 'BTC', 'sell', 1, 55000, 'market');
      
      expect(result.success).toBe(true);
      
      const state = usePositionStore.getState();
      expect(state.positions).toHaveLength(1);
      
      const position = state.positions[0];
      expect(position.quantity).toBe(1); // Reduced by 1
    });

    it('should close position completely (opposite side)', () => {
      const { addPosition, executeTrade } = usePositionStore.getState();
      
      // Add initial position
      addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        entryPrice: 50000,
        currentPrice: 50000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      // Execute full sell
      const result = executeTrade(mockPortfolioId, 'BTC', 'sell', 1, 55000, 'market');
      
      expect(result.success).toBe(true);
      
      const state = usePositionStore.getState();
      expect(state.positions).toHaveLength(0); // Position closed
    });
  });

  describe('Portfolio Statistics', () => {
    it('should calculate portfolio stats', () => {
      const { addPosition, getPortfolioStats } = usePositionStore.getState();
      
      // Add profitable position
      addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        entryPrice: 50000,
        currentPrice: 55000,
        unrealizedPnL: 5000,
        unrealizedPnLPercent: 10,
      });
      
      // Add losing position
      addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'ETH',
        side: 'buy',
        quantity: 10,
        entryPrice: 3000,
        currentPrice: 2800,
        unrealizedPnL: -2000,
        unrealizedPnLPercent: -6.67,
      });
      
      const currentPrices = { BTC: 55000, ETH: 2800 };
      const stats = getPortfolioStats(mockPortfolioId, currentPrices);
      
      expect(stats.totalValue).toBe(83000); // 55000 + 28000
      expect(stats.totalPnL).toBe(3000); // 5000 - 2000
      expect(stats.positionsCount).toBe(2);
      expect(stats.topGainer?.symbol).toBe('BTC');
      expect(stats.topLoser?.symbol).toBe('ETH');
    });

    it('should handle empty portfolio stats', () => {
      const { getPortfolioStats } = usePositionStore.getState();
      
      const stats = getPortfolioStats(mockPortfolioId, {});
      
      expect(stats.totalValue).toBe(0);
      expect(stats.totalPnL).toBe(0);
      expect(stats.positionsCount).toBe(0);
      expect(stats.topGainer).toBeNull();
      expect(stats.topLoser).toBeNull();
    });
  });

  describe('Query Functions', () => {
    it('should get positions by portfolio', () => {
      const { addPosition, getPositionsByPortfolio } = usePositionStore.getState();
      
      // Add position for test portfolio
      addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        entryPrice: 50000,
        currentPrice: 50000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      // Add position for different portfolio
      addPosition({
        portfolioId: 'other-portfolio',
        symbol: 'ETH',
        side: 'buy',
        quantity: 1,
        entryPrice: 3000,
        currentPrice: 3000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      const positions = getPositionsByPortfolio(mockPortfolioId);
      expect(positions).toHaveLength(1);
      expect(positions[0].portfolioId).toBe(mockPortfolioId);
    });

    it('should get position by symbol', () => {
      const { addPosition, getPositionBySymbol } = usePositionStore.getState();
      
      addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        entryPrice: 50000,
        currentPrice: 50000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      const position = getPositionBySymbol(mockPortfolioId, 'BTC');
      expect(position).not.toBeNull();
      expect(position?.symbol).toBe('BTC');
      
      const nonExistent = getPositionBySymbol(mockPortfolioId, 'ETH');
      expect(nonExistent).toBeNull();
    });
  });

  describe('Clear Functions', () => {
    it('should clear positions for specific portfolio', () => {
      const { addPosition, clearPositions } = usePositionStore.getState();
      
      // Add positions for different portfolios
      addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        entryPrice: 50000,
        currentPrice: 50000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      addPosition({
        portfolioId: 'other-portfolio',
        symbol: 'ETH',
        side: 'buy',
        quantity: 1,
        entryPrice: 3000,
        currentPrice: 3000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      clearPositions(mockPortfolioId);
      
      const state = usePositionStore.getState();
      expect(state.positions).toHaveLength(1);
      expect(state.positions[0].portfolioId).toBe('other-portfolio');
    });

    it('should clear all positions', () => {
      const { addPosition, clearPositions } = usePositionStore.getState();
      
      addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        entryPrice: 50000,
        currentPrice: 50000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      clearPositions();
      
      const state = usePositionStore.getState();
      expect(state.positions).toHaveLength(0);
    });

    it('should reset all data', () => {
      const { addPosition, addTransaction, addOrder, resetAllData } = usePositionStore.getState();
      
      // Add some data
      addPosition({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        entryPrice: 50000,
        currentPrice: 50000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
      
      addTransaction({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        quantity: 1,
        price: 50000,
        fee: 50,
        total: 50050,
        timestamp: Date.now(),
      });
      
      addOrder({
        portfolioId: mockPortfolioId,
        symbol: 'BTC',
        side: 'buy',
        type: 'market',
        quantity: 1,
        price: 50000,
      });
      
      resetAllData();
      
      const state = usePositionStore.getState();
      expect(state.positions).toHaveLength(0);
      expect(state.transactions).toHaveLength(0);
      expect(state.orders).toHaveLength(0);
    });
  });
});