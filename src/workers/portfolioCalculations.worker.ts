// Web Worker for heavy portfolio calculations
// This runs in a separate thread to avoid blocking the UI

export interface CalculationRequest {
    type: 'CALCULATE_PORTFOLIO_METRICS' | 'CALCULATE_RISK_METRICS' | 'CALCULATE_PERFORMANCE_ANALYTICS';
    data: any;
}

export interface CalculationResponse {
    type: string;
    result: any;
    error?: string;
}

interface Position {
    id: string;
    symbol: string;
    quantity: number;
    entryPrice: number;
    entryTime: number;
    type: 'long' | 'short';
}

interface Portfolio {
    id: string;
    name: string;
    balance: number;
    initialBalance: number;
    positions: Position[];
    transactions: any[];
    createdAt: number;
}

// Portfolio metrics calculation
function calculatePortfolioMetrics(
    portfolio: Portfolio,
    currentPrices: Record<string, number>
): {
    totalValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    positionsValue: number;
    dayPnL: number;
    dayPnLPercent: number;
    positionMetrics: Array<{
        symbol: string;
        currentPrice: number;
        marketValue: number;
        unrealizedPnL: number;
        unrealizedPnLPercent: number;
        weight: number; // Position weight in portfolio
    }>;
} {
    const positionMetrics = portfolio.positions.map(position => {
        const currentPrice = currentPrices[position.symbol] || position.entryPrice;
        const marketValue = position.quantity * currentPrice;
        const costBasis = position.quantity * position.entryPrice;
        const unrealizedPnL = marketValue - costBasis;
        const unrealizedPnLPercent = (unrealizedPnL / costBasis) * 100;

        return {
            symbol: position.symbol,
            currentPrice,
            marketValue,
            unrealizedPnL,
            unrealizedPnLPercent,
            weight: 0, // Will be calculated after we have total value
        };
    });

    const positionsValue = positionMetrics.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalValue = portfolio.balance + positionsValue;
    const totalPnL = totalValue - portfolio.initialBalance;
    const totalPnLPercent = (totalPnL / portfolio.initialBalance) * 100;

    // Calculate position weights
    positionMetrics.forEach(pos => {
        pos.weight = totalValue > 0 ? (pos.marketValue / totalValue) * 100 : 0;
    });

    // Calculate day P&L (simplified - would need historical data for accurate calculation)
    const dayPnL = totalPnL * 0.1; // Placeholder
    const dayPnLPercent = totalPnLPercent * 0.1; // Placeholder

    return {
        totalValue,
        totalPnL,
        totalPnLPercent,
        positionsValue,
        dayPnL,
        dayPnLPercent,
        positionMetrics,
    };
}

// Risk metrics calculation
function calculateRiskMetrics(
    portfolio: Portfolio,
    currentPrices: Record<string, number>
): {
    portfolioVolatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    valueAtRisk: number;
    diversificationRatio: number;
    concentrationRisk: number;
} {
    const positions = portfolio.positions;
    const totalValue = portfolio.balance + positions.reduce((sum, pos) => {
        const currentPrice = currentPrices[pos.symbol] || pos.entryPrice;
        return sum + (pos.quantity * currentPrice);
    }, 0);

    // Calculate concentration risk (Herfindahl Index)
    const concentrationRisk = positions.reduce((sum, pos) => {
        const currentPrice = currentPrices[pos.symbol] || pos.entryPrice;
        const weight = totalValue > 0 ? ((pos.quantity * currentPrice) / totalValue) : 0;
        return sum + (weight * weight);
    }, 0) * 100;

    // Diversification ratio (simplified)
    const diversificationRatio = positions.length > 0 ? (1 / Math.sqrt(positions.length)) * 100 : 0;

    // Placeholder calculations for other metrics (would need historical data)
    return {
        portfolioVolatility: 15.5, // Placeholder
        sharpeRatio: 1.2, // Placeholder
        maxDrawdown: 5.8, // Placeholder
        valueAtRisk: totalValue * 0.05, // 5% VaR placeholder
        diversificationRatio,
        concentrationRisk,
    };
}

// Performance analytics calculation
function calculatePerformanceAnalytics(
    portfolio: Portfolio,
    transactions: any[]
): {
    totalTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    tradingFrequency: number;
    bestTrade: number;
    worstTrade: number;
} {
    const buyTrades = transactions.filter(t => t.type === 'buy');
    const sellTrades = transactions.filter(t => t.type === 'sell');

    // Simplified calculations (would need more complex matching for real P&L)
    const totalTrades = buyTrades.length + sellTrades.length;

    return {
        totalTrades,
        winRate: 65.5, // Placeholder
        avgWin: 250, // Placeholder
        avgLoss: -150, // Placeholder
        profitFactor: 1.67, // Placeholder
        tradingFrequency: totalTrades / 30, // Trades per day (assuming 30 day period)
        bestTrade: 500, // Placeholder
        worstTrade: -200, // Placeholder
    };
}

// Main message handler
self.onmessage = function (e: MessageEvent<CalculationRequest>) {
    const { type, data } = e.data;

    try {
        let result: any;

        switch (type) {
            case 'CALCULATE_PORTFOLIO_METRICS':
                result = calculatePortfolioMetrics(data.portfolio, data.currentPrices);
                break;

            case 'CALCULATE_RISK_METRICS':
                result = calculateRiskMetrics(data.portfolio, data.currentPrices);
                break;

            case 'CALCULATE_PERFORMANCE_ANALYTICS':
                result = calculatePerformanceAnalytics(data.portfolio, data.transactions);
                break;

            default:
                throw new Error(`Unknown calculation type: ${type}`);
        }

        const response: CalculationResponse = { type, result };
        self.postMessage(response);

    } catch (error) {
        const response: CalculationResponse = {
            type,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
        self.postMessage(response);
    }
};
