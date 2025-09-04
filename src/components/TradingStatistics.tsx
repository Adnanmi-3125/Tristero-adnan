import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, TrendingUp, TrendingDown, BarChart3, DollarSign } from 'lucide-react';
import { usePortfolioStore } from '@/state/portfolioStore';
import { usePrices } from '@/hooks/usePriceContext';
import { calculateTradingStatistics } from '@/utils/portfolioAnalytics';
import { formatCurrency, formatPercentage } from '@/utils/calculations';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export const TradingStatistics: React.FC = () => {
    const { getActivePortfolio } = usePortfolioStore();
    const activePortfolio = getActivePortfolio();
    const { getPrice } = usePrices();

    if (!activePortfolio) {
        return (
            <Card>
                <CardContent className="text-center py-12">
                    <div className="text-4xl mb-4">📈</div>
                    <h3 className="text-xl font-semibold mb-2 text-text-primary">Trading Statistics</h3>
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

    const stats = calculateTradingStatistics(activePortfolio);

    const statisticsItems = [
        {
            label: 'Total Trades',
            value: stats.totalTrades.toString(),
            icon: BarChart3,
            color: 'text-text-primary',
        },
        {
            label: 'Win Rate',
            value: formatPercentage(stats.winRate),
            icon: Trophy,
            color: stats.winRate >= 50 ? 'text-profit' : 'text-loss',
        },
        {
            label: 'Best Trade',
            value: formatCurrency(stats.bestTrade),
            icon: TrendingUp,
            color: 'text-profit',
        },
        {
            label: 'Worst Trade',
            value: formatCurrency(stats.worstTrade),
            icon: TrendingDown,
            color: 'text-loss',
        },
        {
            label: 'Profit Factor',
            value: stats.profitFactor.toFixed(2),
            icon: Target,
            color: stats.profitFactor >= 1 ? 'text-profit' : 'text-loss',
        },
        {
            label: 'Total Volume',
            value: formatCurrency(stats.totalVolume),
            icon: DollarSign,
            color: 'text-text-primary',
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Trading Statistics</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    {statisticsItems.map((item, index) => (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-surface-hover rounded-lg p-4 border border-border-primary"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <item.icon className={`w-4 h-4 ${item.color}`} />
                                <span className="text-text-secondary text-sm">{item.label}</span>
                            </div>
                            <div className={`font-mono font-semibold text-lg ${item.color}`}>
                                {item.value}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Additional Statistics */}
                <div className="mt-6 pt-4 border-t border-border-primary space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Winning Trades</span>
                        <span className="text-profit font-medium">{stats.winningTrades}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Losing Trades</span>
                        <span className="text-loss font-medium">{stats.losingTrades}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Average Win</span>
                        <span className="text-profit font-medium">{formatCurrency(stats.averageWin)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Average Loss</span>
                        <span className="text-loss font-medium">{formatCurrency(-stats.averageLoss)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
