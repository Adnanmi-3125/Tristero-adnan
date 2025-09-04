import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  Position, 
  Transaction, 
  Order, 
  OrderSide,
  OrderType,
  OrderStatus,
  DEFAULT_TRADING_FEE_PERCENT 
} from '@/types/trading';

export interface PositionStoreState {
  // State
  positions: Position[];
  transactions: Transaction[];
  orders: Order[];
  
  // Position Management Actions
  addPosition: (positionData: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  closePosition: (id: string, closePrice: number) => void;
  updatePositionPrices: (priceUpdates: Record<string, number>) => void;
  
  // Transaction Actions
  addTransaction: (transactionData: Omit<Transaction, 'id'>) => string;
  
  // Order Management Actions
  addOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => string;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  fillOrder: (id: string, fillPrice: number) => void;
  cancelOrder: (id: string) => void;
  
  // Query Actions
  getPositionsByPortfolio: (portfolioId: string) => Position[];
  getTransactionsByPortfolio: (portfolioId: string) => Transaction[];
  getOrdersByPortfolio: (portfolioId: string) => Order[];
  getPositionBySymbol: (portfolioId: string, symbol: string) => Position | null;
  
  // Trading Actions
  executeTrade: (
    portfolioId: string,
    symbol: string,
    side: OrderSide,
    quantity: number,
    price: number,
    type: OrderType
  ) => { success: boolean; positionId?: string; transactionId?: string; error?: string };
  
  // Statistics Actions
  getPortfolioStats: (portfolioId: string, currentPrices: Record<string, number>) => {
    totalValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    positionsCount: number;
    topGainer: Position | null;
    topLoser: Position | null;
  };
  
  // Reset/Clear Actions
  clearPositions: (portfolioId?: string) => void;
  clearTransactions: (portfolioId?: string) => void;
  resetAllData: () => void;
}

// Generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate position P&L
function calculatePositionPnL(position: Position, currentPrice: number) {
  const multiplier = position.side === 'buy' ? 1 : -1;
  const priceChange = currentPrice - position.entryPrice;
  const unrealizedPnL = multiplier * priceChange * position.quantity;
  const unrealizedPnLPercent = position.entryPrice > 0 ? (priceChange / position.entryPrice) * 100 * multiplier : 0;
  
  return { unrealizedPnL, unrealizedPnLPercent };
}

export const usePositionStore = create<PositionStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      positions: [],
      transactions: [],
      orders: [],

      // Position Management Actions
      addPosition: (positionData) => {
        const now = Date.now();
        const id = generateId('pos');
        
        const newPosition: Position = {
          id,
          ...positionData,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          positions: [...state.positions, newPosition],
        }));
        
        return id;
      },

      updatePosition: (id, updates) => {
        set((state) => ({
          positions: state.positions.map((position) =>
            position.id === id
              ? { ...position, ...updates, updatedAt: Date.now() }
              : position
          ),
        }));
      },

      closePosition: (id, closePrice) => {
        set((state) => {
          const position = state.positions.find((p) => p.id === id);
          if (!position) return state;

          // Calculate final P&L
          const { unrealizedPnL, unrealizedPnLPercent } = calculatePositionPnL(position, closePrice);
          
          // Create closing transaction
          const fee = position.quantity * closePrice * DEFAULT_TRADING_FEE_PERCENT;
          const netAmount = (position.quantity * closePrice) - fee;
          
          const closingTransaction: Transaction = {
            id: generateId('tx'),
            portfolioId: position.portfolioId,
            symbol: position.symbol,
            side: position.side === 'buy' ? 'sell' : 'buy', // Opposite side to close
            quantity: position.quantity,
            price: closePrice,
            fee,
            total: netAmount,
            timestamp: Date.now(),
            orderId: undefined,
          };

          return {
            positions: state.positions.filter((p) => p.id !== id),
            transactions: [...state.transactions, closingTransaction],
          };
        });
      },

      updatePositionPrices: (priceUpdates) => {
        set((state) => ({
          positions: state.positions.map((position) => {
            const currentPrice = priceUpdates[position.symbol];
            if (!currentPrice) return position;

            const { unrealizedPnL, unrealizedPnLPercent } = calculatePositionPnL(position, currentPrice);

            return {
              ...position,
              currentPrice,
              unrealizedPnL,
              unrealizedPnLPercent,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      // Transaction Actions
      addTransaction: (transactionData) => {
        const id = generateId('tx');
        const newTransaction: Transaction = {
          id,
          ...transactionData,
        };
        
        set((state) => ({
          transactions: [...state.transactions, newTransaction],
        }));
        
        return id;
      },

      // Order Management Actions
      addOrder: (orderData) => {
        const id = generateId('order');
        const newOrder: Order = {
          id,
          ...orderData,
          status: 'pending',
          createdAt: Date.now(),
        };
        
        set((state) => ({
          orders: [...state.orders, newOrder],
        }));
        
        return id;
      },

      updateOrder: (id, updates) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, ...updates } : order
          ),
        }));
      },

      fillOrder: (id, fillPrice) => {
        const { orders } = get();
        const order = orders.find((o) => o.id === id);
        
        if (!order) return;

        // Update order status
        get().updateOrder(id, {
          status: 'filled',
          filledAt: Date.now(),
          filledPrice: fillPrice,
        });

        // Execute the trade
        get().executeTrade(
          order.portfolioId,
          order.symbol,
          order.side,
          order.quantity,
          fillPrice,
          order.type
        );
      },

      cancelOrder: (id) => {
        get().updateOrder(id, { status: 'cancelled' });
      },

      // Query Actions
      getPositionsByPortfolio: (portfolioId) => {
        const { positions } = get();
        return positions.filter((p) => p.portfolioId === portfolioId);
      },

      getTransactionsByPortfolio: (portfolioId) => {
        const { transactions } = get();
        return transactions
          .filter((t) => t.portfolioId === portfolioId)
          .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
      },

      getOrdersByPortfolio: (portfolioId) => {
        const { orders } = get();
        return orders
          .filter((o) => o.portfolioId === portfolioId)
          .sort((a, b) => b.createdAt - a.createdAt); // Most recent first
      },

      getPositionBySymbol: (portfolioId, symbol) => {
        const positions = get().getPositionsByPortfolio(portfolioId);
        return positions.find((p) => p.symbol === symbol) || null;
      },

      // Trading Actions
      executeTrade: (portfolioId, symbol, side, quantity, price, type) => {
        const { positions } = get();
        
        try {
          // Calculate fees and total cost
          const fee = quantity * price * DEFAULT_TRADING_FEE_PERCENT;
          const grossAmount = quantity * price;
          const netAmount = side === 'buy' ? grossAmount + fee : grossAmount - fee;

          // Create transaction record
          const transactionId = get().addTransaction({
            portfolioId,
            symbol,
            side,
            quantity,
            price,
            fee,
            total: netAmount,
            timestamp: Date.now(),
          });

          // Check if we have an existing position for this symbol
          const existingPosition = positions.find(
            (p) => p.portfolioId === portfolioId && p.symbol === symbol
          );

          let positionId: string | undefined;

          if (existingPosition) {
            // Update existing position
            if (existingPosition.side === side) {
              // Same side - add to position
              const newQuantity = existingPosition.quantity + quantity;
              const newEntryPrice = 
                (existingPosition.entryPrice * existingPosition.quantity + price * quantity) / newQuantity;

              get().updatePosition(existingPosition.id, {
                quantity: newQuantity,
                entryPrice: newEntryPrice,
                currentPrice: price,
              });
              
              positionId = existingPosition.id;
            } else {
              // Opposite side - reduce or close position
              if (quantity >= existingPosition.quantity) {
                // Close existing position
                get().closePosition(existingPosition.id, price);
                
                // If quantity is greater, create new position with remaining
                if (quantity > existingPosition.quantity) {
                  const remainingQuantity = quantity - existingPosition.quantity;
                  const { unrealizedPnL, unrealizedPnLPercent } = calculatePositionPnL(
                    { ...existingPosition, entryPrice: price, currentPrice: price } as Position,
                    price
                  );

                  positionId = get().addPosition({
                    portfolioId,
                    symbol,
                    side,
                    quantity: remainingQuantity,
                    entryPrice: price,
                    currentPrice: price,
                    unrealizedPnL,
                    unrealizedPnLPercent,
                  });
                }
              } else {
                // Reduce existing position
                get().updatePosition(existingPosition.id, {
                  quantity: existingPosition.quantity - quantity,
                  currentPrice: price,
                });
                
                positionId = existingPosition.id;
              }
            }
          } else {
            // Create new position
            const { unrealizedPnL, unrealizedPnLPercent } = calculatePositionPnL(
              { entryPrice: price, side } as Position,
              price
            );

            positionId = get().addPosition({
              portfolioId,
              symbol,
              side,
              quantity,
              entryPrice: price,
              currentPrice: price,
              unrealizedPnL,
              unrealizedPnLPercent,
            });
          }

          return { success: true, positionId, transactionId };
        } catch (error) {
          console.error('Trade execution failed:', error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      },

      // Statistics Actions
      getPortfolioStats: (portfolioId, currentPrices) => {
        const positions = get().getPositionsByPortfolio(portfolioId);
        
        if (positions.length === 0) {
          return {
            totalValue: 0,
            totalPnL: 0,
            totalPnLPercent: 0,
            positionsCount: 0,
            topGainer: null,
            topLoser: null,
          };
        }

        let totalValue = 0;
        let totalPnL = 0;
        let topGainer: Position | null = null;
        let topLoser: Position | null = null;
        let maxGain = -Infinity;
        let maxLoss = Infinity;

        positions.forEach((position) => {
          const currentPrice = currentPrices[position.symbol] || position.currentPrice;
          const positionValue = position.quantity * currentPrice;
          const { unrealizedPnL, unrealizedPnLPercent } = calculatePositionPnL(position, currentPrice);

          totalValue += positionValue;
          totalPnL += unrealizedPnL;

          // Track top gainer and loser
          if (unrealizedPnLPercent > maxGain) {
            maxGain = unrealizedPnLPercent;
            topGainer = { ...position, currentPrice, unrealizedPnL, unrealizedPnLPercent };
          }

          if (unrealizedPnLPercent < maxLoss) {
            maxLoss = unrealizedPnLPercent;
            topLoser = { ...position, currentPrice, unrealizedPnL, unrealizedPnLPercent };
          }
        });

        const totalPnLPercent = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;

        return {
          totalValue,
          totalPnL,
          totalPnLPercent,
          positionsCount: positions.length,
          topGainer,
          topLoser,
        };
      },

      // Reset/Clear Actions
      clearPositions: (portfolioId) => {
        if (portfolioId) {
          set((state) => ({
            positions: state.positions.filter((p) => p.portfolioId !== portfolioId),
          }));
        } else {
          set({ positions: [] });
        }
      },

      clearTransactions: (portfolioId) => {
        if (portfolioId) {
          set((state) => ({
            transactions: state.transactions.filter((t) => t.portfolioId !== portfolioId),
          }));
        } else {
          set({ transactions: [] });
        }
      },

      resetAllData: () => {
        set({
          positions: [],
          transactions: [],
          orders: [],
        });
      },
    }),
    {
      name: 'crypto-trader-positions', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Persist all state
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Handle version migrations if needed
        if (version === 0) {
          return persistedState;
        }
        return persistedState;
      },
    }
  )
);

// Selectors for better performance
export const usePositionsByPortfolio = (portfolioId: string) =>
  usePositionStore((state) => state.getPositionsByPortfolio(portfolioId));

export const useTransactionsByPortfolio = (portfolioId: string) =>
  usePositionStore((state) => state.getTransactionsByPortfolio(portfolioId));

export const useOrdersByPortfolio = (portfolioId: string) =>
  usePositionStore((state) => state.getOrdersByPortfolio(portfolioId));

export const usePortfolioStats = (portfolioId: string, currentPrices: Record<string, number>) =>
  usePositionStore((state) => state.getPortfolioStats(portfolioId, currentPrices));

// Action hooks for cleaner component usage
export const usePositionActions = () => ({
  addPosition: usePositionStore((state) => state.addPosition),
  updatePosition: usePositionStore((state) => state.updatePosition),
  closePosition: usePositionStore((state) => state.closePosition),
  updatePositionPrices: usePositionStore((state) => state.updatePositionPrices),
});

export const useTransactionActions = () => ({
  addTransaction: usePositionStore((state) => state.addTransaction),
});

export const useTradingActions = () => ({
  executeTrade: usePositionStore((state) => state.executeTrade),
  addOrder: usePositionStore((state) => state.addOrder),
  fillOrder: usePositionStore((state) => state.fillOrder),
  cancelOrder: usePositionStore((state) => state.cancelOrder),
});