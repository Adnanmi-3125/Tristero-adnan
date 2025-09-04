import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { tradingStorage, storageUtils } from '@/services/storage';
import { usePrices } from '@/hooks/usePriceContext';
import type { Portfolio, Position, Transaction } from '@/state/portfolioStore';

// Query keys for consistent caching
export const portfolioQueryKeys = {
    all: ['portfolios'] as const,
    portfolio: (id: string) => ['portfolios', id] as const,
    positions: (portfolioId: string) => ['positions', portfolioId] as const,
    transactions: (portfolioId: string) => ['transactions', portfolioId] as const,
    activePortfolioId: ['active-portfolio-id'] as const,
    portfolioValue: (portfolioId: string) => ['portfolio-value', portfolioId] as const,
} as const;

// Custom hook for portfolio management with TanStack Query
export const useOptimizedPortfolios = () => {
    const queryClient = useQueryClient();

    // Get all portfolios
    const {
        data: portfolios = [],
        isLoading: portfoliosLoading,
        error: portfoliosError
    } = useQuery({
        queryKey: portfolioQueryKeys.all,
        queryFn: () => tradingStorage.getPortfolios(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    // Get active portfolio ID
    const {
        data: activePortfolioId,
        isLoading: activeIdLoading
    } = useQuery({
        queryKey: portfolioQueryKeys.activePortfolioId,
        queryFn: () => tradingStorage.getActivePortfolioId(),
        staleTime: Infinity, // Don't refetch unless invalidated
    });

    // Get active portfolio
    const {
        data: activePortfolio,
        isLoading: activePortfolioLoading
    } = useQuery({
        queryKey: portfolioQueryKeys.portfolio(activePortfolioId || ''),
        queryFn: () => activePortfolioId ? tradingStorage.getPortfolio(activePortfolioId) : null,
        enabled: !!activePortfolioId,
        staleTime: 30 * 1000, // 30 seconds
    });

    // Mutations for portfolio operations
    const createPortfolioMutation = useMutation({
        mutationFn: async (name: string) => {
            const portfolioId = `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newPortfolio: Portfolio = {
                id: portfolioId,
                name,
                balance: 100000,
                currentBalance: 100000,
                initialBalance: 100000,
                positions: [],
                transactions: [],
                createdAt: Date.now(),
            };

            await tradingStorage.savePortfolio(newPortfolio);

            // Set as active if it's the first portfolio
            if (portfolios.length === 0) {
                await tradingStorage.setActivePortfolioId(portfolioId);
            }

            return { portfolioId, portfolio: newPortfolio };
        },
        onSuccess: (data) => {
            // Optimistically update cache
            queryClient.setQueryData(portfolioQueryKeys.all, (old: Portfolio[] = []) => [
                ...old,
                data.portfolio
            ]);

            if (portfolios.length === 0) {
                queryClient.setQueryData(portfolioQueryKeys.activePortfolioId, data.portfolioId);
                queryClient.setQueryData(portfolioQueryKeys.portfolio(data.portfolioId), data.portfolio);
            }
        },
    });

    const updatePortfolioMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Portfolio> }) => {
            const existing = await tradingStorage.getPortfolio(id);
            if (!existing) throw new Error('Portfolio not found');

            const updated = {
                ...existing,
                ...updates,
                currentBalance: updates.balance || existing.balance
            };
            await tradingStorage.savePortfolio(updated);
            return updated;
        },
        onSuccess: (updatedPortfolio) => {
            // Update caches
            queryClient.setQueryData(portfolioQueryKeys.portfolio(updatedPortfolio.id), updatedPortfolio);
            queryClient.setQueryData(portfolioQueryKeys.all, (old: Portfolio[] = []) =>
                old.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p)
            );
        },
    });

    const setActivePortfolioMutation = useMutation({
        mutationFn: (portfolioId: string) => tradingStorage.setActivePortfolioId(portfolioId),
        onSuccess: (_, portfolioId) => {
            queryClient.setQueryData(portfolioQueryKeys.activePortfolioId, portfolioId);
            // Prefetch the new active portfolio
            queryClient.prefetchQuery({
                queryKey: portfolioQueryKeys.portfolio(portfolioId),
                queryFn: () => tradingStorage.getPortfolio(portfolioId),
            });
        },
    });

    const deletePortfolioMutation = useMutation({
        mutationFn: (id: string) => tradingStorage.deletePortfolio(id),
        onSuccess: (_, deletedId) => {
            // Remove from cache
            queryClient.setQueryData(portfolioQueryKeys.all, (old: Portfolio[] = []) =>
                old.filter(p => p.id !== deletedId)
            );

            // Clear related caches
            queryClient.removeQueries({ queryKey: portfolioQueryKeys.portfolio(deletedId) });
            queryClient.removeQueries({ queryKey: portfolioQueryKeys.positions(deletedId) });
            queryClient.removeQueries({ queryKey: portfolioQueryKeys.transactions(deletedId) });

            // Update active portfolio if deleted
            if (activePortfolioId === deletedId) {
                const remaining = portfolios.filter(p => p.id !== deletedId);
                const newActiveId = remaining.length > 0 ? remaining[0].id : null;
                queryClient.setQueryData(portfolioQueryKeys.activePortfolioId, newActiveId);
            }
        },
    });

    return {
        // Data
        portfolios,
        activePortfolio,
        activePortfolioId,

        // Loading states
        isLoading: portfoliosLoading || activeIdLoading || activePortfolioLoading,
        error: portfoliosError,

        // Actions
        createPortfolio: createPortfolioMutation.mutateAsync,
        updatePortfolio: updatePortfolioMutation.mutateAsync,
        setActivePortfolio: setActivePortfolioMutation.mutateAsync,
        deletePortfolio: deletePortfolioMutation.mutateAsync,

        // Mutation states
        isCreating: createPortfolioMutation.isPending,
        isUpdating: updatePortfolioMutation.isPending,
        isDeleting: deletePortfolioMutation.isPending,
    };
};

// Hook for positions with real-time price updates
export const useOptimizedPositions = (portfolioId: string | null) => {
    const queryClient = useQueryClient();
    const { getPrice } = usePrices();

    // Get positions for portfolio
    const {
        data: positions = [],
        isLoading,
        error
    } = useQuery({
        queryKey: portfolioQueryKeys.positions(portfolioId || ''),
        queryFn: () => portfolioId ? tradingStorage.getPositionsByPortfolio(portfolioId) : [],
        enabled: !!portfolioId,
        staleTime: 30 * 1000, // 30 seconds
    });

    // Calculate positions with live prices (memoized for performance)
    const positionsWithLiveData = useMemo(() => {
        return positions.map(position => {
            const currentPrice = getPrice(position.symbol) || position.entryPrice;
            const marketValue = position.quantity * currentPrice;
            const costBasis = position.quantity * position.entryPrice;
            const unrealizedPnL = marketValue - costBasis;
            const unrealizedPnLPercent = (unrealizedPnL / costBasis) * 100;

            return {
                ...position,
                currentPrice,
                marketValue,
                unrealizedPnL,
                unrealizedPnLPercent,
                duration: Date.now() - position.entryTime,
            };
        });
    }, [positions, getPrice]);

    // Trade execution mutation
    const executeTradeMutation = useMutation({
        mutationFn: async (trade: {
            symbol: string;
            type: 'buy' | 'sell';
            quantity: number;
            price: number;
        }) => {
            if (!portfolioId) throw new Error('No active portfolio');

            const portfolio = await tradingStorage.getPortfolio(portfolioId);
            if (!portfolio) throw new Error('Portfolio not found');

            const totalCost = trade.quantity * trade.price;

            if (trade.type === 'buy') {
                if (portfolio.balance < totalCost) {
                    throw new Error('Insufficient funds');
                }

                // Create transaction
                const transaction: Transaction = {
                    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    symbol: trade.symbol,
                    type: 'buy',
                    quantity: trade.quantity,
                    price: trade.price,
                    timestamp: Date.now(),
                    portfolioId,
                };

                // Handle position
                const existingPositions = await tradingStorage.getPositionsByPortfolio(portfolioId);
                const existingPosition = existingPositions.find(p => p.symbol === trade.symbol);

                if (existingPosition) {
                    // Update existing position
                    const totalQuantity = existingPosition.quantity + trade.quantity;
                    const newAvgPrice = ((existingPosition.quantity * existingPosition.entryPrice) + totalCost) / totalQuantity;

                    const updatedPosition = {
                        ...existingPosition,
                        quantity: totalQuantity,
                        entryPrice: newAvgPrice,
                        portfolioId,
                    };

                    await tradingStorage.savePosition(updatedPosition);
                } else {
                    // Create new position
                    const newPosition: Position & { portfolioId: string } = {
                        id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        symbol: trade.symbol,
                        quantity: trade.quantity,
                        entryPrice: trade.price,
                        entryTime: Date.now(),
                        type: 'long',
                        portfolioId,
                    };

                    await tradingStorage.savePosition(newPosition);
                }

                // Update portfolio balance
                const updatedPortfolio = {
                    ...portfolio,
                    balance: portfolio.balance - totalCost,
                    currentBalance: portfolio.balance - totalCost,
                    transactions: [...portfolio.transactions, transaction],
                };

                await Promise.all([
                    tradingStorage.savePortfolio(updatedPortfolio),
                    tradingStorage.saveTransaction(transaction)
                ]);

                return { transaction, portfolio: updatedPortfolio };
            }

            // Handle sell logic here...
            throw new Error('Sell functionality not implemented yet');
        },
        onSuccess: () => {
            // Invalidate related queries for fresh data
            if (portfolioId) {
                queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.portfolio(portfolioId) });
                queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.positions(portfolioId) });
                queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.transactions(portfolioId) });
                queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.all });
            }
        },
    });

    return {
        positions: positionsWithLiveData,
        isLoading,
        error,
        executeTrade: executeTradeMutation.mutateAsync,
        isExecutingTrade: executeTradeMutation.isPending,
    };
};

// Hook for transactions
export const useOptimizedTransactions = (portfolioId: string | null) => {
    const {
        data: transactions = [],
        isLoading,
        error
    } = useQuery({
        queryKey: portfolioQueryKeys.transactions(portfolioId || ''),
        queryFn: () => portfolioId ? tradingStorage.getTransactionsByPortfolio(portfolioId) : [],
        enabled: !!portfolioId,
        staleTime: 60 * 1000, // 1 minute
    });

    return {
        transactions,
        isLoading,
        error,
    };
};

// Hook for portfolio value with real-time prices
export const useOptimizedPortfolioValue = (portfolioId: string | null) => {
    const { getPrice } = usePrices();
    const { data: portfolio } = useQuery({
        queryKey: portfolioQueryKeys.portfolio(portfolioId || ''),
        queryFn: () => portfolioId ? tradingStorage.getPortfolio(portfolioId) : null,
        enabled: !!portfolioId,
    });

    const { data: positions = [] } = useQuery({
        queryKey: portfolioQueryKeys.positions(portfolioId || ''),
        queryFn: () => portfolioId ? tradingStorage.getPositionsByPortfolio(portfolioId) : [],
        enabled: !!portfolioId,
    });

    // Calculate portfolio value with live prices
    const portfolioValue = useMemo(() => {
        if (!portfolio || !positions) return 0;

        const positionsValue = positions.reduce((total, position) => {
            const currentPrice = getPrice(position.symbol) || position.entryPrice;
            return total + (position.quantity * currentPrice);
        }, 0);

        return portfolio.balance + positionsValue;
    }, [portfolio, positions, getPrice]);

    const totalPnL = useMemo(() => {
        if (!portfolio) return 0;
        return portfolioValue - portfolio.initialBalance;
    }, [portfolioValue, portfolio]);

    const totalPnLPercent = useMemo(() => {
        if (!portfolio || portfolio.initialBalance === 0) return 0;
        return (totalPnL / portfolio.initialBalance) * 100;
    }, [totalPnL, portfolio]);

    return {
        portfolioValue,
        totalPnL,
        totalPnLPercent,
        availableBalance: portfolio?.balance || 0,
        positionsCount: positions.length,
    };
};

// Initialize storage and migration
export const useStorageInitialization = () => {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ['storage-init'],
        queryFn: async () => {
            // Initialize IndexedDB
            await tradingStorage.init();

            // Migrate from localStorage if needed
            await storageUtils.migrateFromLocalStorage();

            // Prefetch initial data
            await Promise.all([
                queryClient.prefetchQuery({
                    queryKey: portfolioQueryKeys.all,
                    queryFn: () => tradingStorage.getPortfolios(),
                }),
                queryClient.prefetchQuery({
                    queryKey: portfolioQueryKeys.activePortfolioId,
                    queryFn: () => tradingStorage.getActivePortfolioId(),
                })
            ]);

            return true;
        },
        staleTime: Infinity, // Only run once
        retry: false,
    });
};
