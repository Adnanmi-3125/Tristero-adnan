import React, { useRef, useEffect, useContext } from 'react';
import { PriceContext } from '@/context/PriceContext';
import { usePortfolioStore } from '@/state/portfolioStore';
import { formatCurrency, formatPercentage } from '@/utils/calculations';
import type { Position } from '@/state/portfolioStore';

interface LivePortfolioPnLProps {
    portfolioId: string;
    className?: string;
    showPercentage?: boolean;
}

export const LivePortfolioPnL = React.memo<LivePortfolioPnLProps>(({
    portfolioId,
    className = "font-mono",
    showPercentage = true
}) => {
    const spanRef = useRef<HTMLSpanElement>(null);
    const percentRef = useRef<HTMLDivElement>(null);
    const lastPnLRef = useRef<number | null>(null);
    const lastPercentRef = useRef<number | null>(null);

    const { getPortfolio } = usePortfolioStore();
    const priceContext = useContext(PriceContext);

    useEffect(() => {
        if (!priceContext?.getPrice || !spanRef.current) return;

        const portfolio = getPortfolio(portfolioId);
        if (!portfolio) return;

        const updatePnL = () => {
            const portfolio = getPortfolio(portfolioId);
            if (!portfolio || !spanRef.current) return;

            // Calculate total invested (cost basis)
            const totalInvested = portfolio.positions.reduce((sum: number, pos: Position) => {
                return sum + (pos.quantity * pos.entryPrice);
            }, 0);

            // Calculate current market value of positions
            const currentPositionsValue = portfolio.positions.reduce((sum: number, pos: Position) => {
                const currentPrice = priceContext.getPrice(pos.symbol) || pos.entryPrice;
                return sum + (pos.quantity * currentPrice);
            }, 0);

            // P&L = Current Value - Cost Basis
            const totalPnL = currentPositionsValue - totalInvested;
            const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

            // Only update DOM if values changed
            if (totalPnL !== lastPnLRef.current) {
                const color = totalPnL >= 0 ? '#10b981' : '#ef4444';
                spanRef.current.style.color = color;
                spanRef.current.textContent = formatCurrency(totalPnL);
                lastPnLRef.current = totalPnL;
            }

            if (showPercentage && percentRef.current && totalPnLPercent !== lastPercentRef.current) {
                const color = totalPnLPercent >= 0 ? '#10b981' : '#ef4444';
                percentRef.current.style.color = color;
                percentRef.current.textContent = formatPercentage(totalPnLPercent);
                lastPercentRef.current = totalPnLPercent;
            }
        };

        // Initial update
        updatePnL();

        // Subscribe to price updates
        const unsubscribe = priceContext?.subscribe?.(() => {
            requestAnimationFrame(updatePnL);
        });

        return unsubscribe;
    }, [portfolioId, priceContext, getPortfolio, showPercentage]);

    // Calculate initial values
    const portfolio = getPortfolio(portfolioId);
    const initialTotalInvested = portfolio?.positions.reduce((sum: number, pos: Position) => sum + (pos.quantity * pos.entryPrice), 0) || 0;
    const initialCurrentValue = portfolio?.positions.reduce((sum: number, pos: Position) => {
        const currentPrice = priceContext?.getPrice(pos.symbol) || pos.entryPrice;
        return sum + (pos.quantity * currentPrice);
    }, 0) || 0;
    const initialPnL = initialCurrentValue - initialTotalInvested;
    const initialPnLPercent = initialTotalInvested > 0 ? (initialPnL / initialTotalInvested) * 100 : 0;

    return (
        <div className={className}>
            <span ref={spanRef} className={`font-bold ${initialPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatCurrency(initialPnL)}
            </span>
            {showPercentage && (
                <div ref={percentRef} className={`text-xs ${initialPnLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatPercentage(initialPnLPercent)}
                </div>
            )}
        </div>
    );
});

LivePortfolioPnL.displayName = 'LivePortfolioPnL';
