import React, { useState } from 'react';
import { usePortfolioStore } from '@/state/portfolioStore';
import { Dropdown } from '@/components/ui/Dropdown';
import { formatCurrency } from '@/utils/calculations';
import { LivePortfolioValue } from '@/components/LivePortfolioValue';

export const PortfolioSelector = React.memo(() => {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState('');

    const {
        portfolios,
        activePortfolioId,
        createPortfolio,
        setActivePortfolio,
        getActivePortfolio,
    } = usePortfolioStore();

    const activePortfolio = getActivePortfolio();



    const handleCreatePortfolio = () => {
        if (newPortfolioName.trim()) {
            createPortfolio(newPortfolioName.trim());
            setNewPortfolioName('');
            setShowCreateForm(false);
        }
    };

    // Create default portfolio if none exists
    React.useEffect(() => {
        if (portfolios.length === 0) {
            createPortfolio('Main Portfolio');
        }
    }, [portfolios.length, createPortfolio]);

    return (
        <div className="bg-surface border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Portfolio</h3>
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                    + New
                </button>
            </div>

            {/* Portfolio Selector */}
            {portfolios.length > 0 && (
                <div className="mb-4">
                    <Dropdown
                        options={portfolios.map(p => ({ value: p.id, label: p.name }))}
                        value={activePortfolioId || ''}
                        placeholder="Select Portfolio"
                        onChange={setActivePortfolio}
                    />
                </div>
            )}

            {/* Create Portfolio Form */}
            {showCreateForm && (
                <div className="mb-4 p-3 bg-surface-hover rounded border border-border-primary">
                    <input
                        type="text"
                        value={newPortfolioName}
                        onChange={(e) => setNewPortfolioName(e.target.value)}
                        placeholder="Portfolio name"
                        className="w-full bg-background border border-border-primary rounded px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                        onKeyPress={(e) => e.key === 'Enter' && handleCreatePortfolio()}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreatePortfolio}
                            disabled={!newPortfolioName.trim()}
                            className="flex-1 bg-profit hover:bg-profit/80 disabled:bg-surface text-white py-1 rounded text-sm transition-colors"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => {
                                setShowCreateForm(false);
                                setNewPortfolioName('');
                            }}
                            className="flex-1 bg-surface hover:bg-surface-hover text-text-primary py-1 rounded text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Portfolio Stats */}
            {activePortfolio && (
                <div className="space-y-3">
                    <div className="bg-surface-hover rounded p-3">
                        <div className="text-xs text-text-secondary mb-1">Total Value</div>
                        <div className="text-lg font-bold text-text-primary">
                            <LivePortfolioValue
                                portfolioId={activePortfolio.id}
                                className="text-lg font-bold text-text-primary"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-surface-hover rounded p-3">
                            <div className="text-xs text-text-secondary mb-1">Cash</div>
                            <div className="text-sm font-semibold text-profit">
                                {formatCurrency(activePortfolio.balance)}
                            </div>
                        </div>

                        <div className="bg-surface-hover rounded p-3">
                            <div className="text-xs text-text-secondary mb-1">Positions</div>
                            <div className="text-sm font-semibold text-primary-500">
                                {activePortfolio.positions.length}
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-hover rounded p-3">
                        <div className="text-xs text-text-secondary mb-1">Total P&L</div>
                        <div className="text-sm font-semibold">
                            <LivePortfolioValue
                                portfolioId={activePortfolio.id}
                                showPnL={true}
                                className="text-sm font-semibold"
                            />
                        </div>
                    </div>

                    <div className="bg-surface-hover rounded p-3">
                        <div className="text-xs text-text-secondary mb-1">Trades</div>
                        <div className="text-sm font-semibold text-text-primary">
                            {activePortfolio.transactions.length}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

PortfolioSelector.displayName = 'PortfolioSelector';
