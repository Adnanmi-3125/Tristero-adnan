import { useState, useEffect, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PriceProvider } from '@/context/PriceContext';
import { VirtualizedAssetList } from '@/components/VirtualizedAssetList';
import { TradingForm } from '@/components/TradingForm';
import { PortfolioSelector } from '@/components/PortfolioSelector';
import { PositionsTable } from '@/components/PositionsTable';
import { TransactionHistory } from '@/components/TransactionHistory';
import { useOptimizedPortfolios, useStorageInitialization } from '@/hooks/useOptimizedPortfolio';
import { useOptimizedPriceStream, usePriceStreamPerformance } from '@/hooks/useOptimizedPriceStream';
import { usePortfolioMetrics, useRiskMetrics, cleanupWorkers } from '@/hooks/usePortfolioCalculations';
import { queryClient } from '@/services/queryClient';
import type { CryptoAsset } from '@/types/trading';

type ViewMode = 'overview' | 'trading' | 'positions' | 'analytics';

// Performance monitoring component
const PerformanceMonitor = () => {
    const { totalUpdates, updatesPerSecond, elapsed } = usePriceStreamPerformance();

    if (process.env.NODE_ENV !== 'development') return null;

    return (
        <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-600 rounded p-2 text-xs text-gray-400 z-50">
            <div>Updates: {totalUpdates}</div>
            <div>Rate: {updatesPerSecond}/s</div>
            <div>Uptime: {elapsed}s</div>
        </div>
    );
};

// Loading fallback component
const LoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-white text-lg">{message}</div>
        </div>
    </div>
);

// Main optimized app component
const OptimizedAppContent = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('overview');
    const [selectedAsset, setSelectedAsset] = useState<CryptoAsset | null>(null);

    // Initialize storage and portfolios
    const { isLoading: storageLoading } = useStorageInitialization();
    const {
        portfolios,
        activePortfolio,
        isLoading: portfoliosLoading,
        createPortfolio
    } = useOptimizedPortfolios();

    // Real-time price data
    const { isConnected, priceCount } = useOptimizedPriceStream();

    // Portfolio analytics (only calculate when needed)
    const { data: portfolioMetrics } = usePortfolioMetrics(
        activePortfolio || null,
        {} // Would pass current prices here
    );

    const { data: riskMetrics } = useRiskMetrics(
        activePortfolio || null,
        {} // Would pass current prices here
    );

    // Create default portfolio if none exists
    useEffect(() => {
        if (!portfoliosLoading && portfolios.length === 0) {
            createPortfolio('Main Portfolio');
        }
    }, [portfolios.length, portfoliosLoading, createPortfolio]);

    // Cleanup workers on app shutdown
    useEffect(() => {
        return () => {
            cleanupWorkers();
        };
    }, []);

    // Show loading screen during initialization
    if (storageLoading || portfoliosLoading) {
        return <LoadingFallback message="Initializing trading platform..." />;
    }

    const navItems = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'trading', label: 'Trading', icon: '💱' },
        { id: 'positions', label: 'Positions', icon: '📈' },
        { id: 'analytics', label: 'Analytics', icon: '🧮' },
    ] as const;

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                🚀 Crypto Paper Trading
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span>Portfolio: {activePortfolio?.name || 'None'}</span>
                                <span>
                                    Balance: {activePortfolio
                                        ? `$${activePortfolio.balance.toLocaleString()}`
                                        : '$0'
                                    }
                                </span>
                                <div className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                                    <span>{isConnected ? 'Live' : 'Disconnected'} • {priceCount} assets</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Navigation */}
                <nav className="mb-8">
                    <div className="flex flex-wrap gap-2">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setViewMode(item.id)}
                                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors duration-200
                  ${viewMode === item.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }
                `}
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Main content */}
                <main>
                    {viewMode === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <VirtualizedAssetList
                                    onAssetSelect={setSelectedAsset}
                                    selectedAsset={selectedAsset}
                                    maxItems={100} // Limit for performance
                                />
                            </div>
                            <div className="space-y-6">
                                <PortfolioSelector />

                                {portfolioMetrics ? (
                                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-white mb-3">Portfolio Metrics</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Total Value</span>
                                                <span className="text-white font-semibold">
                                                    ${(portfolioMetrics as any)?.totalValue?.toLocaleString() || '0'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Total P&L</span>
                                                <span className={(portfolioMetrics as any)?.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                    ${(portfolioMetrics as any)?.totalPnL?.toLocaleString() || '0'}
                                                    ({(portfolioMetrics as any)?.totalPnLPercent?.toFixed(2) || '0.00'}%)
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Positions Value</span>
                                                <span className="text-white">
                                                    ${(portfolioMetrics as any)?.positionsValue?.toLocaleString() || '0'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {viewMode === 'trading' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <VirtualizedAssetList
                                    onAssetSelect={setSelectedAsset}
                                    selectedAsset={selectedAsset}
                                />
                            </div>
                            <div className="space-y-6">
                                {selectedAsset ? (
                                    <TradingForm
                                        selectedAsset={selectedAsset}
                                        onTradeExecuted={() => {
                                            // Refresh portfolio data after trade
                                            queryClient.invalidateQueries({ queryKey: ['portfolios'] });
                                        }}
                                    />
                                ) : (
                                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
                                        <div className="text-4xl mb-4">💱</div>
                                        <h3 className="text-xl font-semibold mb-2 text-white">Select an Asset</h3>
                                        <p className="text-gray-400">
                                            Choose an asset from the list to start trading
                                        </p>
                                    </div>
                                )}
                                <PortfolioSelector />
                            </div>
                        </div>
                    )}

                    {viewMode === 'positions' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                                <div className="xl:col-span-3">
                                    <PositionsTable />
                                </div>
                                <div className="xl:col-span-1">
                                    <PortfolioSelector />
                                </div>
                            </div>
                            <TransactionHistory />
                        </div>
                    )}

                    {viewMode === 'analytics' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Portfolio Analytics */}
                            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-white mb-4">Portfolio Analytics</h3>
                                {portfolioMetrics ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="bg-gray-900 rounded p-3">
                                                <div className="text-gray-400 mb-1">Total Value</div>
                                                <div className="text-white font-semibold text-lg">
                                                    ${(portfolioMetrics as any)?.totalValue?.toLocaleString() || '0'}
                                                </div>
                                            </div>
                                            <div className="bg-gray-900 rounded p-3">
                                                <div className="text-gray-400 mb-1">Day P&L</div>
                                                <div className={`font-semibold text-lg ${(portfolioMetrics as any)?.dayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    ${(portfolioMetrics as any)?.dayPnL?.toLocaleString() || '0'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Position breakdown */}
                                        <div>
                                            <h4 className="text-white font-semibold mb-2">Position Breakdown</h4>
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {((portfolioMetrics as any)?.positionMetrics || []).map((pos: any) => (
                                                    <div key={pos.symbol} className="flex justify-between items-center bg-gray-900 rounded p-2 text-sm">
                                                        <span className="text-white">{pos.symbol}</span>
                                                        <div className="text-right">
                                                            <div className="text-white">${pos?.marketValue?.toLocaleString() || '0'}</div>
                                                            <div className="text-gray-400">{pos?.weight?.toFixed(1) || '0'}%</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <div className="text-4xl mb-4">📊</div>
                                        <p>No portfolio data available</p>
                                    </div>
                                )}
                            </div>

                            {/* Risk Analytics */}
                            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-white mb-4">Risk Analytics</h3>
                                {riskMetrics ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Concentration Risk</span>
                                                <span className="text-white">{(riskMetrics as any)?.concentrationRisk?.toFixed(1) || '0'}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Diversification</span>
                                                <span className="text-white">{(riskMetrics as any)?.diversificationRatio?.toFixed(1) || '0'}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Value at Risk (5%)</span>
                                                <span className="text-white">${(riskMetrics as any)?.valueAtRisk?.toLocaleString() || '0'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Sharpe Ratio</span>
                                                <span className="text-white">{(riskMetrics as any)?.sharpeRatio?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <div className="text-4xl mb-4">⚠️</div>
                                        <p>No risk data available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>

                {/* Footer */}
                <footer className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
                        <p>Crypto Paper Trading Platform - Optimized Version</p>
                        <div className="flex items-center gap-4 text-xs">
                            <span>🚀 IndexedDB Storage</span>
                            <span>⚡ Web Workers</span>
                            <span>🔄 TanStack Query</span>
                            <span>📡 WebSocket Real-time</span>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Performance monitor (dev only) */}
            <PerformanceMonitor />
        </div>
    );
};

// Wrapper component with providers
const OptimizedAppWithProviders = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <PriceProvider>
                <Suspense fallback={<LoadingFallback message="Initializing optimized platform..." />}>
                    <OptimizedAppContent />
                </Suspense>
                {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
            </PriceProvider>
        </QueryClientProvider>
    );
};

export default OptimizedAppWithProviders;
