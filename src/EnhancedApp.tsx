import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, BarChart3, Wallet, History, FileText } from 'lucide-react';
import { EnhancedAssetList } from '@/components/EnhancedAssetList';
import { TradingForm } from '@/components/TradingForm';
import { PortfolioSelector } from '@/components/PortfolioSelector';
import { PositionsTable } from '@/components/PositionsTable';
import { TransactionHistory } from '@/components/TransactionHistory';
import { TradingChart } from '@/components/TradingChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { usePortfolioStore } from '@/state/portfolioStore';
import { usePrices } from '@/hooks/usePriceContext';
import { formatCurrency } from '@/utils/calculations';
import { LivePortfolioValue } from '@/components/LivePortfolioValue';
import { ThemeProvider } from '@/context/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Dropdown } from '@/components/ui/Dropdown';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { PortfolioModal } from '@/components/PortfolioModal';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { PortfolioPerformance } from '@/components/PortfolioPerformance';
import { TradingStatistics } from '@/components/TradingStatistics';
import { useKeyboardShortcuts, createNavigationShortcuts, createModalShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/utils/cn';
import type { CryptoAsset } from '@/types/trading';

type ViewMode = 'overview' | 'trading' | 'positions' | 'history' | 'analytics';

const EnhancedAppInner = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('overview');
    const [selectedAsset, setSelectedAsset] = useState<CryptoAsset | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreatePortfolio, setShowCreatePortfolio] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState('');
    const [showPortfolioModal, setShowPortfolioModal] = useState(false);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

    const {
        getActivePortfolio,
        portfolios,
        activePortfolioId,
        setActivePortfolio,
        createPortfolio
    } = usePortfolioStore();
    const { getPrice } = usePrices();
    const { toggleTheme } = useTheme();
    const activePortfolio = getActivePortfolio();


    // Simulate initial loading
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    // Portfolio management handlers
    const handleCreatePortfolio = () => {
        if (newPortfolioName.trim()) {
            const newId = createPortfolio(newPortfolioName.trim());
            setActivePortfolio(newId);
            setNewPortfolioName('');
            setShowCreatePortfolio(false);
        }
    };

    const portfolioOptions = [
        ...portfolios.map(p => ({ value: p.id, label: p.name })),
        { value: 'create-new', label: '+ Create New Portfolio' }
    ];

    const handlePortfolioChange = (value: string) => {
        if (value === 'create-new') {
            setShowCreatePortfolio(true);
        } else {
            setActivePortfolio(value);
        }
    };

    // Keyboard shortcuts
    const navigationShortcuts = createNavigationShortcuts((mode: string) => setViewMode(mode as ViewMode));
    const modalShortcuts = createModalShortcuts(
        () => setShowPortfolioModal(!showPortfolioModal),
        toggleTheme,
        () => setShowKeyboardHelp(!showKeyboardHelp)
    );

    useKeyboardShortcuts({
        shortcuts: [...navigationShortcuts, ...modalShortcuts],
        enabled: true
    });

    // Navigation items with enhanced styling
    const navItems = [
        { id: 'overview', label: 'Overview', icon: TrendingUp, color: 'blue' },
        { id: 'trading', label: 'Trading', icon: BarChart3, color: 'green' },
        { id: 'positions', label: 'Positions', icon: Wallet, color: 'purple' },
        { id: 'history', label: 'History', icon: FileText, color: 'indigo' },
        { id: 'analytics', label: 'Analytics', icon: History, color: 'orange' },
    ] as const;

    // Portfolio stats with live data
    const portfolioStats = activePortfolio ? {
        totalValue: activePortfolio.balance + activePortfolio.positions.reduce((sum, pos) => {
            const currentPrice = getPrice(pos.symbol) || pos.entryPrice;
            return sum + (pos.quantity * currentPrice);
        }, 0),
        totalPnL: 0, // Would calculate based on positions
        positionsCount: activePortfolio.positions.length,
        availableBalance: activePortfolio.balance,
    } : null;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <motion.h2
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-2xl font-bold text-text-primary mb-2"
                    >
                        Loading Trading Platform
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="text-text-secondary"
                    >
                        Initializing real-time market data...
                    </motion.p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background transition-colors duration-300 flex flex-col">
            {/* Enhanced Header */}
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="border-b border-border-primary bg-surface/95 backdrop-blur-sm sticky top-0 z-40"
            >
                <div className="max-w-7xl mx-auto p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 md:gap-6">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-3"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-lg md:text-xl font-bold text-text-primary">CryptoTrade Pro</h1>
                                    <p className="text-xs text-text-secondary hidden sm:block">Paper Trading Platform</p>
                                </div>
                            </motion.div>

                            {/* Portfolio Quick Stats */}
                            {portfolioStats && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="hidden md:flex items-center gap-6 text-sm"
                                >
                                    <button
                                        className="text-center hover:bg-surface-hover rounded-lg px-3 py-2 transition-colors"
                                        onClick={() => setShowPortfolioModal(true)}
                                    >
                                        <div className="text-text-secondary">Total Value</div>
                                        <div className="text-text-primary font-semibold">
                                            {activePortfolio ? (
                                                <LivePortfolioValue
                                                    portfolioId={activePortfolio.id}
                                                    className="text-text-primary font-semibold"
                                                />
                                            ) : (
                                                formatCurrency(portfolioStats.totalValue)
                                            )}
                                        </div>
                                    </button>
                                    <div className="w-px h-8 bg-border-primary" />
                                    <div className="text-center">
                                        <div className="text-text-secondary">Positions</div>
                                        <div className="text-text-primary font-semibold">
                                            {portfolioStats.positionsCount}
                                        </div>
                                    </div>
                                    <div className="w-px h-8 bg-border-primary" />
                                    <div className="text-center">
                                        <div className="text-text-secondary">Available</div>
                                        <div className="text-text-primary font-semibold">
                                            {formatCurrency(portfolioStats.availableBalance)}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            {/* Portfolio Selector */}
                            <div className="hidden sm:block min-w-[180px]">
                                <Dropdown
                                    options={portfolioOptions}
                                    value={activePortfolioId || ''}
                                    placeholder="Select Portfolio"
                                    onChange={handlePortfolioChange}
                                    size="sm"
                                />
                            </div>
                            <HelpTooltip />
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </motion.header>

            {/* Enhanced Navigation */}
            <motion.nav
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="border-b border-border-primary bg-surface/50"
            >
                <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
                    <div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
                        {navItems.map((item, index) => (
                            <motion.button
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setViewMode(item.id)}
                                className={cn(
                                    'relative flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 overflow-hidden whitespace-nowrap min-w-0 flex-shrink-0 text-xs sm:text-sm',
                                    viewMode === item.id
                                        ? 'bg-primary-600 text-white shadow-lg'
                                        : 'bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary'
                                )}
                            >
                                <item.icon className="w-4 h-4 relative z-10" />
                                <span className="relative z-10 hidden sm:inline">{item.label}</span>
                                <span className="relative z-10 sm:hidden text-xs">{item.label.split(' ')[0]}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </motion.nav>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto p-4 md:p-6 w-full">
                <AnimatePresence mode="wait">
                    {viewMode === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                <div className="xl:col-span-2">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <BarChart3 className="w-5 h-5 text-primary-500" />
                                                Market Overview
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <EnhancedAssetList
                                                onAssetSelect={setSelectedAsset}
                                                selectedAsset={selectedAsset}
                                                maxItems={50}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-6">
                                    <PortfolioSelector />

                                    {selectedAsset && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                        >
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Quick Chart</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <TradingChart
                                                        symbol={selectedAsset.symbol}
                                                        height={250}
                                                        showToolbar={false}
                                                    />
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {viewMode === 'trading' && (
                        <motion.div
                            key="trading"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 xl:grid-cols-3 gap-6"
                        >
                            <div className="xl:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Market Assets</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <EnhancedAssetList
                                            onAssetSelect={setSelectedAsset}
                                            selectedAsset={selectedAsset}
                                        />
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                {selectedAsset ? (
                                    <TradingForm
                                        selectedAsset={selectedAsset}
                                        onTradeExecuted={() => {
                                            // Handle successful trade
                                        }}
                                    />
                                ) : (
                                    <Card>
                                        <CardContent className="text-center py-12">
                                            <h3 className="text-xl font-semibold mb-2 text-text-primary">Select an Asset</h3>
                                            <p className="text-text-secondary">
                                                Choose an asset from the list to start trading
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                <PortfolioSelector />
                            </div>
                        </motion.div>
                    )}

                    {viewMode === 'positions' && (
                        <motion.div
                            key="positions"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <PositionsTable />
                        </motion.div>
                    )}

                    {viewMode === 'history' && (
                        <motion.div
                            key="history"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <TransactionHistory />
                        </motion.div>
                    )}

                    {viewMode === 'analytics' && (
                        <motion.div
                            key="analytics"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-8"
                        >
                            {/* Portfolio Analytics Cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                                <PortfolioPerformance />
                                <TradingStatistics />
                            </div>

                            {/* Asset Performance Chart */}
                            {selectedAsset ? (
                                <Card className="lg:col-span-2">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <BarChart3 className="w-5 h-5 text-primary-500" />
                                                {selectedAsset.symbol} Performance Chart
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                Real-time
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <TradingChart symbol={selectedAsset.symbol} height={450} />
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="lg:col-span-2">
                                    <CardContent className="text-center py-16">
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                            className="space-y-4"
                                        >
                                            <div className="text-6xl mb-6">📈</div>
                                            <h3 className="text-2xl font-semibold mb-3 text-text-primary">Asset Chart</h3>
                                            <p className="text-text-secondary max-w-md mx-auto">
                                                Select an asset from Overview or Trading to view its live performance chart
                                            </p>
                                        </motion.div>
                                    </CardContent>
                                </Card>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Portfolio Creation Modal */}
            <ConfirmationModal
                isOpen={showCreatePortfolio}
                onClose={() => {
                    setShowCreatePortfolio(false);
                    setNewPortfolioName('');
                }}
                onConfirm={handleCreatePortfolio}
                title="Create New Portfolio"
                message="Enter a name for your new trading portfolio"
                confirmText="Create Portfolio"
                type="info"
            >
                <div className="p-6">
                    <input
                        type="text"
                        value={newPortfolioName}
                        onChange={(e) => setNewPortfolioName(e.target.value)}
                        placeholder="Portfolio name..."
                        className="w-full bg-background border border-border-primary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleCreatePortfolio()}
                        autoFocus
                    />
                </div>
            </ConfirmationModal>

            {/* Portfolio Modal */}
            <PortfolioModal
                isOpen={showPortfolioModal}
                onClose={() => setShowPortfolioModal(false)}
            />

            {/* Keyboard Shortcuts Help */}
            <KeyboardShortcutsHelp
                isOpen={showKeyboardHelp}
                onClose={() => setShowKeyboardHelp(false)}
            />

            {/* Enhanced Footer */}
            <motion.footer
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-auto border-t border-border-primary bg-surface/50"
            >
                <div className="max-w-7xl mx-auto p-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-text-secondary text-sm">
                            © 2025 CryptoTrade Pro - Advanced Paper Trading Platform
                        </p>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs text-text-secondary">
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                Real-time WebSocket
                            </span>
                            <span>🚀 IndexedDB Storage</span>
                            <span>⚡ Web Workers</span>
                            <span>🔄 TanStack Query</span>
                        </div>
                    </div>
                </div>
            </motion.footer>
        </div>
    );
};

const EnhancedApp = () => {
    return (
        <ThemeProvider>
            <EnhancedAppInner />
        </ThemeProvider>
    );
};

export default EnhancedApp;
