import type { Portfolio } from '@/state/portfolioStore';

export interface PortfolioPerformance {
    totalValue: number;
    totalPnL: number;
    totalPnLPercentage: number;
    dayPnL: number;
    dayPnLPercentage: number;
    totalInvested: number;
    availableCash: number;
}

export interface TradingStatistics {
    totalTrades: number;
    winRate: number;
    winningTrades: number;
    losingTrades: number;
    bestTrade: number;
    worstTrade: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number;
    totalVolume: number;
}

export const calculatePortfolioPerformance = (
    portfolio: Portfolio,
    currentPrices: Record<string, number>
): PortfolioPerformance => {
    // Safety checks
    if (!portfolio || !currentPrices) {
        return {
            totalValue: 0,
            totalPnL: 0,
            totalPnLPercentage: 0,
            dayPnL: 0,
            dayPnLPercentage: 0,
            totalInvested: 0,
            availableCash: 0,
        };
    }

    let totalValue = portfolio.balance || 0;
    let totalInvested = 0;
    let totalPnL = 0;

    // Calculate position values and P&L
    for (const position of portfolio.positions || []) {
        // Ensure we have valid position data
        if (!position.symbol || !position.quantity || !position.entryPrice) continue;

        const currentPrice = currentPrices[position.symbol] || position.entryPrice || 0;
        const positionValue = position.quantity * currentPrice;
        const positionCost = position.quantity * position.entryPrice;
        const positionPnL = positionValue - positionCost;

        totalValue += positionValue;
        totalInvested += positionCost;
        totalPnL += positionPnL;
    }

    // Calculate realized P&L from closed transactions
    const realizedPnL = portfolio.transactions
        .filter(t => t.type === 'sell')
        .reduce((sum, transaction) => {
            // Find corresponding buy transaction(s) to calculate realized P&L
            const buyTransactions = portfolio.transactions.filter(
                t => t.type === 'buy' &&
                    t.symbol === transaction.symbol &&
                    t.timestamp < transaction.timestamp
            );

            if (buyTransactions.length > 0) {
                const avgBuyPrice = buyTransactions.reduce((sum, t) => sum + (t.price * t.quantity), 0) /
                    buyTransactions.reduce((sum, t) => sum + t.quantity, 0);
                return sum + ((transaction.price - avgBuyPrice) * transaction.quantity);
            }
            return sum;
        }, 0);

    const totalPnLWithRealized = totalPnL + realizedPnL;
    const totalPnLPercentage = totalInvested > 0 ? (totalPnLWithRealized / totalInvested) * 100 : 0;

    // Calculate day P&L (simplified - would need historical data for accurate calculation)
    const dayPnL = totalPnL * 0.1; // Simplified approximation
    const dayPnLPercentage = totalValue > 0 ? (dayPnL / totalValue) * 100 : 0;

    return {
        totalValue,
        totalPnL: totalPnLWithRealized,
        totalPnLPercentage,
        dayPnL,
        dayPnLPercentage,
        totalInvested,
        availableCash: portfolio.balance,
    };
};

export const calculateTradingStatistics = (
    portfolio: Portfolio,
): TradingStatistics => {
    // Safety checks
    if (!portfolio || !portfolio.transactions) {
        return {
            totalTrades: 0,
            winRate: 0,
            winningTrades: 0,
            losingTrades: 0,
            bestTrade: 0,
            worstTrade: 0,
            averageWin: 0,
            averageLoss: 0,
            profitFactor: 0,
            totalVolume: 0,
        };
    }

    const transactions = portfolio.transactions;
    const totalTrades = transactions.length;

    if (totalTrades === 0) {
        return {
            totalTrades: 0,
            winRate: 0,
            winningTrades: 0,
            losingTrades: 0,
            bestTrade: 0,
            worstTrade: 0,
            averageWin: 0,
            averageLoss: 0,
            profitFactor: 0,
            totalVolume: 0,
        };
    }

    // Calculate trade results
    const tradeResults: number[] = [];
    const sellTransactions = transactions.filter(t => t.type === 'sell');

    for (const sellTx of sellTransactions) {
        // Find corresponding buy transactions
        const buyTransactions = transactions.filter(
            t => t.type === 'buy' &&
                t.symbol === sellTx.symbol &&
                t.timestamp < sellTx.timestamp
        ).sort((a, b) => a.timestamp - b.timestamp);

        if (buyTransactions.length > 0) {
            // Use FIFO method for calculating P&L
            let remainingQuantity = sellTx.quantity;
            let totalCost = 0;

            for (const buyTx of buyTransactions) {
                const usedQuantity = Math.min(remainingQuantity, buyTx.quantity);
                totalCost += usedQuantity * buyTx.price;
                remainingQuantity -= usedQuantity;

                if (remainingQuantity <= 0) break;
            }

            const revenue = sellTx.quantity * sellTx.price;
            const pnl = revenue - totalCost;
            tradeResults.push(pnl);
        }
    }

    // Calculate statistics
    const winningTrades = tradeResults.filter(pnl => pnl > 0);
    const losingTrades = tradeResults.filter(pnl => pnl < 0);
    const winRate = tradeResults.length > 0 ? (winningTrades.length / tradeResults.length) * 100 : 0;

    const bestTrade = tradeResults.length > 0 ? Math.max(...tradeResults) : 0;
    const worstTrade = tradeResults.length > 0 ? Math.min(...tradeResults) : 0;

    const averageWin = winningTrades.length > 0 ?
        winningTrades.reduce((sum, pnl) => sum + pnl, 0) / winningTrades.length : 0;

    const averageLoss = losingTrades.length > 0 ?
        Math.abs(losingTrades.reduce((sum, pnl) => sum + pnl, 0) / losingTrades.length) : 0;

    const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0;

    const totalVolume = transactions.reduce((sum, tx) => sum + (tx.price * tx.quantity), 0);

    return {
        totalTrades: tradeResults.length,
        winRate,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        bestTrade,
        worstTrade,
        averageWin,
        averageLoss,
        profitFactor,
        totalVolume,
    };
};
