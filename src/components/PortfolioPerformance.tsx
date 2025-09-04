import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { usePortfolioStore } from '@/state/portfolioStore';
import { usePrices } from '@/hooks/usePriceContext';
import { calculatePortfolioPerformance } from '@/utils/portfolioAnalytics';
import { formatCurrency, formatPercentage } from '@/utils/calculations';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { LivePortfolioValue } from '@/components/LivePortfolioValue';
import { LivePortfolioPnL } from '@/components/LivePortfolioPnL';

export const PortfolioPerformance: React.FC = () => {
    const { getActivePortfolio } = usePortfolioStore();
    const activePortfolio = getActivePortfolio();
    const { getPrice, subscribe } = usePrices();
    const [, forceUpdate] = useState({});

    // Force re-render when prices update for live data
    useEffect(() => {
        if (!subscribe) return;

        const unsubscribe = subscribe(() => {
            forceUpdate({});
        });

        return unsubscribe;
    }, [subscribe]);

    if (!activePortfolio) {
        return (
            <Card>
                <CardContent className="text-center py-12">
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="text-xl font-semibold mb-2 text-text-primary">Portfolio Performance</h3>
                    <p className="text-text-secondary">No active portfolio selected</p>
                </CardContent>
            </Card>
        );
    }

    // Create prices object from getPrice function
    const currentPrices: Record<string, number> = {};
    activePortfolio.positions.forEach(pos => {
        currentPrices[pos.symbol] = getPrice(pos.symbol) || pos.entryPrice;
    });

    const performance = calculatePortfolioPerformance(activePortfolio, currentPrices);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Total Value - Live */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-surface-hover rounded-lg p-3 sm:p-4 border border-border-primary"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-text-primary" />
                            <span className="text-text-secondary text-sm">Total Value</span>
                        </div>
                        <div className="font-mono font-semibold text-base sm:text-lg text-text-primary">
                            <LivePortfolioValue portfolioId={activePortfolio.id} />
                        </div>
                    </motion.div>

                    {/* Total P&L - Live */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-surface-hover rounded-lg p-3 sm:p-4 border border-border-primary"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-profit" />
                            <span className="text-text-secondary text-sm">Total P&L</span>
                        </div>
                        <div className="font-mono font-semibold text-base sm:text-lg">
                            <LivePortfolioPnL portfolioId={activePortfolio.id} showPercentage={true} />
                        </div>
                    </motion.div>

                    {/* Day P&L - Static (calculated) */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-surface-hover rounded-lg p-3 sm:p-4 border border-border-primary"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className={`w-4 h-4 ${performance.dayPnL >= 0 ? 'text-profit' : 'text-loss'}`} />
                            <span className="text-text-secondary text-sm">Day P&L</span>
                        </div>
                        <div className={`font-mono font-semibold text-base sm:text-lg ${performance.dayPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {formatCurrency(performance.dayPnL)}
                        </div>
                        <div className={`text-xs ${performance.dayPnL >= 0 ? 'text-profit' : 'text-loss'} opacity-75`}>
                            {formatPercentage(performance.dayPnLPercentage)}
                        </div>
                    </motion.div>

                    {/* Available Cash */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-surface-hover rounded-lg p-3 sm:p-4 border border-border-primary"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-text-primary" />
                            <span className="text-text-secondary text-sm">Available Cash</span>
                        </div>
                        <div className="font-mono font-semibold text-base sm:text-lg text-text-primary">
                            {formatCurrency(performance.availableCash)}
                        </div>
                    </motion.div>
                </div>

                {/* Investment Summary */}
                <div className="mt-6 pt-4 border-t border-border-primary">
                    <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Total Invested</span>
                        <span className="text-text-primary font-medium">
                            {formatCurrency(performance.totalInvested)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
