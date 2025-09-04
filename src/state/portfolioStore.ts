import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  entryTime: number;
  type: 'long' | 'short';
}

export interface Transaction {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: number;
  portfolioId: string;
}

export interface Portfolio {
  id: string;
  name: string;
  balance: number; // Available cash
  currentBalance: number; // Current available balance (alias for balance for compatibility)
  initialBalance: number; // Starting balance ($100,000)
  positions: Position[];
  transactions: Transaction[];
  createdAt: number;
}

interface PortfolioState {
  portfolios: Portfolio[];
  activePortfolioId: string | null;

  // Portfolio management
  createPortfolio: (name: string) => string;
  deletePortfolio: (portfolioId: string) => void;
  setActivePortfolio: (portfolioId: string) => void;
  getActivePortfolio: () => Portfolio | null;
  updatePortfolio: (portfolioId: string, updates: Partial<Portfolio>) => void;
  getPortfolioById: (portfolioId: string) => Portfolio | null;
  resetPortfolios: () => void;

  // Trading actions
  executeTrade: (trade: {
    symbol: string;
    type: 'buy' | 'sell';
    quantity: number;
    price: number;
  }) => boolean;

  // Position management
  closePosition: (positionId: string, currentPrice: number) => boolean;

  // Portfolio calculations
  getPortfolioValue: (portfolioId: string, currentPrices: Record<string, number>) => number;
  getTotalPnL: (portfolioId: string, currentPrices: Record<string, number>) => number;
  updatePortfolioBalance: (portfolioId: string, amount: number) => void;
  calculatePortfolioValue: (portfolioId: string, currentPrices: Record<string, number>) => number;
  getPortfolio: (portfolioId: string) => Portfolio | null;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      portfolios: [],
      activePortfolioId: null,

      createPortfolio: (name: string) => {
        const portfolioId = `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newPortfolio: Portfolio = {
          id: portfolioId,
          name,
          balance: 100000, // $100k starting balance
          currentBalance: 100000, // Same as balance for compatibility
          initialBalance: 100000,
          positions: [],
          transactions: [],
          createdAt: Date.now(),
        };

        set((state) => ({
          portfolios: [...state.portfolios, newPortfolio],
          activePortfolioId: state.activePortfolioId || portfolioId, // Set as active if first portfolio
        }));

        return portfolioId;
      },

      deletePortfolio: (portfolioId: string) => {
        set((state) => {
          const remainingPortfolios = state.portfolios.filter(p => p.id !== portfolioId);

          // If this was the last portfolio, create a default one
          if (remainingPortfolios.length === 0) {
            const defaultPortfolioId = `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const defaultPortfolio: Portfolio = {
              id: defaultPortfolioId,
              name: 'Default Portfolio',
              balance: 100000,
              currentBalance: 100000,
              initialBalance: 100000,
              positions: [],
              transactions: [],
              createdAt: Date.now(),
            };

            return {
              portfolios: [defaultPortfolio],
              activePortfolioId: defaultPortfolioId,
            };
          }

          return {
            portfolios: remainingPortfolios,
            activePortfolioId: state.activePortfolioId === portfolioId
              ? remainingPortfolios[0]?.id || null
              : state.activePortfolioId,
          };
        });
      },

      setActivePortfolio: (portfolioId: string) => {
        const { portfolios } = get();
        const portfolioExists = portfolios.some(p => p.id === portfolioId);
        if (portfolioExists) {
          set({ activePortfolioId: portfolioId });
        }
      },

      getActivePortfolio: () => {
        const { portfolios, activePortfolioId } = get();
        return portfolios.find(p => p.id === activePortfolioId) || null;
      },

      executeTrade: (trade) => {
        const { portfolios, activePortfolioId } = get();
        if (!activePortfolioId) return false;

        const portfolioIndex = portfolios.findIndex(p => p.id === activePortfolioId);
        if (portfolioIndex === -1) return false;

        const portfolio = portfolios[portfolioIndex];
        const totalCost = trade.quantity * trade.price;

        if (trade.type === 'buy') {
          // Check if enough balance for purchase
          if (portfolio.balance < totalCost) {
            return false; // Insufficient funds
          }

          // Create transaction
          const transaction: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            symbol: trade.symbol,
            type: 'buy',
            quantity: trade.quantity,
            price: trade.price,
            timestamp: Date.now(),
            portfolioId: activePortfolioId,
          };

          // Check if position exists
          const existingPositionIndex = portfolio.positions.findIndex(p => p.symbol === trade.symbol);

          if (existingPositionIndex >= 0) {
            // Update existing position (average price)
            const existingPosition = portfolio.positions[existingPositionIndex];
            const totalQuantity = existingPosition.quantity + trade.quantity;
            const newAvgPrice = ((existingPosition.quantity * existingPosition.entryPrice) + totalCost) / totalQuantity;

            portfolio.positions[existingPositionIndex] = {
              ...existingPosition,
              quantity: totalQuantity,
              entryPrice: newAvgPrice,
            };
          } else {
            // Create new position
            const newPosition: Position = {
              id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              symbol: trade.symbol,
              quantity: trade.quantity,
              entryPrice: trade.price,
              entryTime: Date.now(),
              type: 'long',
            };
            portfolio.positions.push(newPosition);
          }

          // Update balance and add transaction
          portfolio.balance -= totalCost;
          portfolio.currentBalance = portfolio.balance; // Keep in sync
          portfolio.transactions.push(transaction);

        } else if (trade.type === 'sell') {
          // Find position to sell from
          const positionIndex = portfolio.positions.findIndex(p => p.symbol === trade.symbol);
          if (positionIndex === -1) return false; // No position to sell

          const position = portfolio.positions[positionIndex];
          if (position.quantity < trade.quantity) return false; // Insufficient quantity

          // Create transaction
          const transaction: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            symbol: trade.symbol,
            type: 'sell',
            quantity: trade.quantity,
            price: trade.price,
            timestamp: Date.now(),
            portfolioId: activePortfolioId,
          };

          // Update position
          if (position.quantity === trade.quantity) {
            // Close position completely
            portfolio.positions.splice(positionIndex, 1);
          } else {
            // Reduce position quantity
            portfolio.positions[positionIndex].quantity -= trade.quantity;
          }

          // Update balance and add transaction
          portfolio.balance += totalCost;
          portfolio.currentBalance = portfolio.balance; // Keep in sync
          portfolio.transactions.push(transaction);
        }

        // Update state
        set((state) => ({
          portfolios: state.portfolios.map((p, index) =>
            index === portfolioIndex ? portfolio : p
          ),
        }));

        return true;
      },

      closePosition: (positionId: string, currentPrice: number) => {
        const { portfolios, activePortfolioId } = get();
        if (!activePortfolioId) return false;

        const portfolioIndex = portfolios.findIndex(p => p.id === activePortfolioId);
        if (portfolioIndex === -1) return false;

        const portfolio = portfolios[portfolioIndex];
        const positionIndex = portfolio.positions.findIndex(p => p.id === positionId);
        if (positionIndex === -1) return false;

        const position = portfolio.positions[positionIndex];

        // Execute sell trade to close position
        return get().executeTrade({
          symbol: position.symbol,
          type: 'sell',
          quantity: position.quantity,
          price: currentPrice,
        });
      },

      getPortfolioValue: (portfolioId: string, currentPrices: Record<string, number>) => {
        const portfolio = get().portfolios.find(p => p.id === portfolioId);
        if (!portfolio) return 0;

        let totalValue = portfolio.balance; // Start with cash balance

        // Add value of all positions
        portfolio.positions.forEach(position => {
          const currentPrice = currentPrices[position.symbol] || position.entryPrice;
          totalValue += position.quantity * currentPrice;
        });

        return totalValue;
      },

      getTotalPnL: (portfolioId: string, currentPrices: Record<string, number>) => {
        const portfolio = get().portfolios.find(p => p.id === portfolioId);
        if (!portfolio) return 0;

        const currentValue = get().getPortfolioValue(portfolioId, currentPrices);
        return currentValue - portfolio.initialBalance;
      },

      // Additional methods for tests and compatibility
      updatePortfolio: (portfolioId: string, updates: Partial<Portfolio>) => {
        set((state) => ({
          portfolios: state.portfolios.map(p =>
            p.id === portfolioId
              ? {
                ...p,
                ...updates,
                currentBalance: updates.currentBalance !== undefined ? updates.currentBalance : (updates.balance !== undefined ? updates.balance : p.currentBalance)
              }
              : p
          )
        }));
      },

      getPortfolioById: (portfolioId: string) => {
        return get().portfolios.find(p => p.id === portfolioId) || null;
      },

      resetPortfolios: () => {
        set({ portfolios: [], activePortfolioId: null });
      },

      updatePortfolioBalance: (portfolioId: string, amount: number) => {
        set((state) => ({
          portfolios: state.portfolios.map(p =>
            p.id === portfolioId
              ? {
                ...p,
                balance: p.balance + amount,
                currentBalance: p.balance + amount
              }
              : p
          )
        }));
      },

      calculatePortfolioValue: (portfolioId: string, currentPrices: Record<string, number>) => {
        // Alias for getPortfolioValue for compatibility
        return get().getPortfolioValue(portfolioId, currentPrices);
      },

      getPortfolio: (portfolioId: string) => {
        return get().portfolios.find(p => p.id === portfolioId) || null;
      },
    }),
    {
      name: 'portfolio-storage',
      version: 1,
    }
  )
);