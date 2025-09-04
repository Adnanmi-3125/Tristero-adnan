import React, { useRef, useEffect, useContext } from 'react';
import { usePrices } from '@/hooks/usePriceContext';
import { PriceContext } from '@/context/PriceContext';
import { usePortfolioStore } from '@/state/portfolioStore';
import { formatCurrency, formatPercentage } from '@/utils/calculations';

interface LivePortfolioValueProps {
    portfolioId: string;
    className?: string;
    showPnL?: boolean;
}

// Component that shows live-updating portfolio value and P&L
export const LivePortfolioValue = React.memo<LivePortfolioValueProps>(({
    portfolioId,
    className = "text-text-primary",
    showPnL = false
}) => {
    const spanRef = useRef<HTMLSpanElement>(null);
    const { getPrice } = usePrices();
    const context = useContext(PriceContext);
    const { getPortfolioValue, getTotalPnL, portfolios } = usePortfolioStore();
    const lastValueRef = useRef<{ value: number; pnl: number; pnlPercent: number } | null>(null);

    const portfolio = portfolios.find(p => p.id === portfolioId);

    useEffect(() => {
        if (!spanRef.current || !portfolio) return;

        // Calculate initial values
        const currentPrices: Record<string, number> = {};
        portfolio.positions.forEach(position => {
            currentPrices[position.symbol] = getPrice(position.symbol) || position.entryPrice;
        });

        const initialValue = getPortfolioValue(portfolioId, currentPrices);
        const initialPnL = getTotalPnL(portfolioId, currentPrices);
        const initialPnLPercent = (initialPnL / portfolio.initialBalance) * 100;

        updateDisplay(initialValue, initialPnL, initialPnLPercent);
        lastValueRef.current = { value: initialValue, pnl: initialPnL, pnlPercent: initialPnLPercent };

        // Subscribe to price updates
        let unsubscribe: (() => void) | null = null;

        if (context?.subscribe) {
            unsubscribe = context.subscribe((prices: Record<string, number>) => {
                // Check if any of our positions have price updates
                const hasRelevantUpdate = portfolio.positions.some(position =>
                    prices[position.symbol] !== undefined
                );

                if (hasRelevantUpdate) {
                    const updatedPrices: Record<string, number> = {};
                    portfolio.positions.forEach(position => {
                        updatedPrices[position.symbol] = prices[position.symbol] || getPrice(position.symbol) || position.entryPrice;
                    });

                    const newValue = getPortfolioValue(portfolioId, updatedPrices);
                    const newPnL = getTotalPnL(portfolioId, updatedPrices);
                    const newPnLPercent = (newPnL / portfolio.initialBalance) * 100;

                    if (!lastValueRef.current ||
                        newValue !== lastValueRef.current.value ||
                        newPnL !== lastValueRef.current.pnl) {
                        updateDisplay(newValue, newPnL, newPnLPercent);
                        lastValueRef.current = { value: newValue, pnl: newPnL, pnlPercent: newPnLPercent };
                    }
                }
            });
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [portfolioId, portfolio, getPrice, context, getPortfolioValue, getTotalPnL, showPnL]);

    const updateDisplay = (value: number, pnl: number, pnlPercent: number) => {
        if (!spanRef.current) return;

        if (showPnL) {
            const colorClass = pnl >= 0 ? 'text-green-400' : 'text-red-400';
            spanRef.current.innerHTML = `
        <span class="${colorClass}">${formatCurrency(pnl)} (${formatPercentage(pnlPercent)})</span>
      `;
        } else {
            spanRef.current.textContent = formatCurrency(value);
        }
    };

    // Initial render
    if (!portfolio) return <span className={className}>-</span>;

    const currentPrices: Record<string, number> = {};
    portfolio.positions.forEach(position => {
        currentPrices[position.symbol] = getPrice(position.symbol) || position.entryPrice;
    });

    const initialValue = getPortfolioValue(portfolioId, currentPrices);
    const initialPnL = getTotalPnL(portfolioId, currentPrices);
    const initialPnLPercent = (initialPnL / portfolio.initialBalance) * 100;

    if (showPnL) {
        const colorClass = initialPnL >= 0 ? 'text-green-400' : 'text-red-400';
        return (
            <span ref={spanRef} className={`${className} ${colorClass}`}>
                {formatCurrency(initialPnL)} ({formatPercentage(initialPnLPercent)})
            </span>
        );
    }

    return (
        <span ref={spanRef} className={className}>
            {formatCurrency(initialValue)}
        </span>
    );
});

LivePortfolioValue.displayName = 'LivePortfolioValue';
