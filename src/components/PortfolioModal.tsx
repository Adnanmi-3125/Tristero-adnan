import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, DollarSign, Target } from 'lucide-react';
import { usePortfolioStore } from '@/state/portfolioStore';
import { usePrices } from '@/hooks/usePriceContext';
import { formatCurrency } from '@/utils/calculations';
import { LivePortfolioValue } from '@/components/LivePortfolioValue';
import { LivePortfolioPnL } from '@/components/LivePortfolioPnL';
import { Button } from '@/components/ui/Button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface PortfolioModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ isOpen, onClose }) => {
    const [showCreatePortfolio, setShowCreatePortfolio] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState('');

    const {
        getActivePortfolio,
        portfolios,
        activePortfolioId,
        setActivePortfolio,
        createPortfolio
    } = usePortfolioStore();

    const { getPrice } = usePrices();
    const activePortfolio = getActivePortfolio();

    const handleCreatePortfolio = () => {
        if (newPortfolioName.trim()) {
            const newId = createPortfolio(newPortfolioName.trim());
            setActivePortfolio(newId);
            setNewPortfolioName('');
            setShowCreatePortfolio(false);
        }
    };


    // Calculate portfolio metrics
    const portfolioMetrics = activePortfolio ? {
        totalValue: activePortfolio.balance + activePortfolio.positions.reduce((sum, pos) => {
            const currentPrice = getPrice(pos.symbol) || pos.entryPrice;
            return sum + (pos.quantity * currentPrice);
        }, 0),
        totalInvested: activePortfolio.positions.reduce((sum, pos) => sum + (pos.quantity * pos.entryPrice), 0),
        availableCash: activePortfolio.balance,
        positionsCount: activePortfolio.positions.length,
        transactionsCount: activePortfolio.transactions?.length || 0
    } : null;


    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border border-border-primary rounded-xl shadow-2xl"
                        >
                            {/* Header */}
                            <div className="p-4 sm:p-6 border-b border-border-primary">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                            <Wallet className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-text-primary">Portfolio Overview</h2>
                                            <p className="text-sm text-text-secondary">Manage and switch between portfolios</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-text-secondary hover:text-text-primary transition-colors p-1"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 sm:p-6">
                                {/* Portfolio Stats */}
                                {portfolioMetrics && (
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                                        <div className="bg-background border border-border-primary rounded-lg p-3 sm:p-4 text-center">
                                            <div className="text-text-secondary mb-1 flex items-center justify-center gap-1">
                                                <DollarSign className="w-4 h-4" />
                                                Total Value
                                            </div>
                                            <div className="text-lg font-bold text-text-primary">
                                                {activePortfolio ? (
                                                    <LivePortfolioValue
                                                        portfolioId={activePortfolio.id}
                                                        className="text-lg font-bold text-text-primary"
                                                    />
                                                ) : (
                                                    formatCurrency(portfolioMetrics.totalValue)
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-background border border-border-primary rounded-lg p-3 sm:p-4 text-center">
                                            <div className="text-text-secondary mb-1 flex items-center justify-center gap-1 text-xs sm:text-sm">
                                                <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                                                P&L
                                            </div>
                                            {activePortfolio ? (
                                                <LivePortfolioPnL
                                                    portfolioId={activePortfolio.id}
                                                    className="text-base sm:text-lg"
                                                    showPercentage={true}
                                                />
                                            ) : (
                                                <div className="text-base sm:text-lg font-bold text-text-secondary">
                                                    $0.00
                                                    <div className="text-xs text-text-secondary">
                                                        0.00%
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-background border border-border-primary rounded-lg p-3 sm:p-4 text-center">
                                            <div className="text-text-secondary mb-1 flex items-center justify-center gap-1 text-xs sm:text-sm">
                                                <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                                                Positions
                                            </div>
                                            <div className="text-base sm:text-lg font-bold text-text-primary">
                                                {portfolioMetrics.positionsCount}
                                            </div>
                                        </div>
                                        <div className="bg-background border border-border-primary rounded-lg p-3 sm:p-4 text-center">
                                            <div className="text-text-secondary mb-1 flex items-center justify-center gap-1">
                                                <DollarSign className="w-4 h-4" />
                                                Available
                                            </div>
                                            <div className="text-lg font-bold text-text-primary">
                                                {formatCurrency(portfolioMetrics.availableCash)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Portfolio List */}
                                {portfolios.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-text-primary">All Portfolios</h3>
                                            <Button
                                                size="sm"
                                                onClick={() => setShowCreatePortfolio(true)}
                                                className="flex items-center gap-2 whitespace-nowrap"
                                            >
                                                <p className="text-sm">New Portfolio</p>
                                            </Button>
                                        </div>
                                        <div className="space-y-3 max-h-60 overflow-y-auto">
                                            {portfolios.map((portfolio) => {
                                                const isActive = portfolio.id === activePortfolioId;
                                                const portfolioValue = portfolio.balance + portfolio.positions.reduce((sum, pos) => {
                                                    const currentPrice = getPrice(pos.symbol) || pos.entryPrice;
                                                    return sum + (pos.quantity * currentPrice);
                                                }, 0);

                                                return (
                                                    <div
                                                        key={portfolio.id}
                                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${isActive
                                                            ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/20'
                                                            : 'border-border-primary bg-background hover:bg-surface hover:border-primary-300'
                                                            }`}
                                                        onClick={() => setActivePortfolio(portfolio.id)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h4 className="font-medium text-text-primary">{portfolio.name}</h4>
                                                                <p className="text-sm text-text-secondary">
                                                                    {portfolio.positions.length} positions • {portfolio.transactions?.length || 0} trades
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-lg font-bold text-text-primary">
                                                                    {formatCurrency(portfolioValue)}
                                                                </div>
                                                                <div className="text-sm text-text-secondary">
                                                                    {formatCurrency(portfolio.balance)} cash
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Portfolio Modal */}
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
        </>
    );
};
