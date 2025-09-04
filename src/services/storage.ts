import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Portfolio, Position, Transaction } from '@/state/portfolioStore';

// Database schema definition
interface TradingDB extends DBSchema {
    portfolios: {
        key: string;
        value: Portfolio;
        indexes: {
            'by-created': number;
            'by-updated': number;
        };
    };
    positions: {
        key: string;
        value: Position & { portfolioId: string };
        indexes: {
            'by-portfolio': string;
            'by-symbol': string;
            'by-entry-time': number;
        };
    };
    transactions: {
        key: string;
        value: Transaction;
        indexes: {
            'by-portfolio': string;
            'by-timestamp': number;
            'by-symbol': string;
        };
    };
    settings: {
        key: string;
        value: unknown;
    };
}

class TradingStorage {
    private db: IDBPDatabase<TradingDB> | null = null;
    private readonly dbName = 'trading-platform-db';
    private readonly version = 1;

    async init(): Promise<void> {
        if (this.db) return;

        this.db = await openDB<TradingDB>(this.dbName, this.version, {
            upgrade(db) {
                // Portfolios store
                if (!db.objectStoreNames.contains('portfolios')) {
                    const portfolioStore = db.createObjectStore('portfolios', { keyPath: 'id' });
                    portfolioStore.createIndex('by-created', 'createdAt');
                    portfolioStore.createIndex('by-updated', 'updatedAt');
                }

                // Positions store
                if (!db.objectStoreNames.contains('positions')) {
                    const positionStore = db.createObjectStore('positions', { keyPath: 'id' });
                    positionStore.createIndex('by-portfolio', 'portfolioId');
                    positionStore.createIndex('by-symbol', 'symbol');
                    positionStore.createIndex('by-entry-time', 'entryTime');
                }

                // Transactions store
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
                    transactionStore.createIndex('by-portfolio', 'portfolioId');
                    transactionStore.createIndex('by-timestamp', 'timestamp');
                    transactionStore.createIndex('by-symbol', 'symbol');
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            },
        });
    }

    // Portfolio operations
    async getPortfolios(): Promise<Portfolio[]> {
        await this.init();
        return this.db!.getAll('portfolios');
    }

    async getPortfolio(id: string): Promise<Portfolio | undefined> {
        await this.init();
        return this.db!.get('portfolios', id);
    }

    async savePortfolio(portfolio: Portfolio): Promise<void> {
        await this.init();
        await this.db!.put('portfolios', {
            ...portfolio,
            updatedAt: Date.now()
        } as Portfolio & { updatedAt: number });
    }

    async deletePortfolio(id: string): Promise<void> {
        await this.init();
        const tx = this.db!.transaction(['portfolios', 'positions', 'transactions'], 'readwrite');

        // Delete portfolio and all related data
        await Promise.all([
            tx.objectStore('portfolios').delete(id),
            this.clearPositionsByPortfolio(id),
            this.clearTransactionsByPortfolio(id)
        ]);
    }

    // Position operations
    async getPositionsByPortfolio(portfolioId: string): Promise<Position[]> {
        await this.init();
        return this.db!.getAllFromIndex('positions', 'by-portfolio', portfolioId);
    }

    async savePosition(position: Position & { portfolioId: string }): Promise<void> {
        await this.init();
        await this.db!.put('positions', position);
    }

    async deletePosition(id: string): Promise<void> {
        await this.init();
        await this.db!.delete('positions', id);
    }

    private async clearPositionsByPortfolio(portfolioId: string): Promise<void> {
        await this.init();
        const positions = await this.getPositionsByPortfolio(portfolioId);
        const tx = this.db!.transaction('positions', 'readwrite');
        await Promise.all(positions.map(p => tx.store.delete(p.id)));
    }

    // Transaction operations
    async getTransactionsByPortfolio(portfolioId: string): Promise<Transaction[]> {
        await this.init();
        return this.db!.getAllFromIndex('transactions', 'by-portfolio', portfolioId);
    }

    async saveTransaction(transaction: Transaction): Promise<void> {
        await this.init();
        await this.db!.put('transactions', transaction);
    }

    private async clearTransactionsByPortfolio(portfolioId: string): Promise<void> {
        await this.init();
        const transactions = await this.getTransactionsByPortfolio(portfolioId);
        const tx = this.db!.transaction('transactions', 'readwrite');
        await Promise.all(transactions.map(t => tx.store.delete(t.id)));
    }

    // Settings operations
    async getSetting<T>(key: string): Promise<T | undefined> {
        await this.init();
        const result = await this.db!.get('settings', key);
        return (result as any)?.value as T;
    }

    async setSetting<T>(key: string, value: T): Promise<void> {
        await this.init();
        await this.db!.put('settings', {
            key,
            value: value as unknown
        });
    }

    async getActivePortfolioId(): Promise<string | null> {
        return await this.getSetting<string>('activePortfolioId') || null;
    }

    async setActivePortfolioId(id: string | null): Promise<void> {
        await this.setSetting('activePortfolioId', id);
    }

    // Bulk operations for performance
    async bulkSaveTransactions(transactions: Transaction[]): Promise<void> {
        await this.init();
        const tx = this.db!.transaction('transactions', 'readwrite');
        await Promise.all(transactions.map(t => tx.store.put(t)));
    }

    async bulkSavePositions(positions: (Position & { portfolioId: string })[]): Promise<void> {
        await this.init();
        const tx = this.db!.transaction('positions', 'readwrite');
        await Promise.all(positions.map(p => tx.store.put(p)));
    }

    // Analytics and querying
    async getTransactionsBySymbol(symbol: string): Promise<Transaction[]> {
        await this.init();
        return this.db!.getAllFromIndex('transactions', 'by-symbol', symbol);
    }

    async getTransactionsByDateRange(start: number, end: number): Promise<Transaction[]> {
        await this.init();
        const tx = this.db!.transaction('transactions', 'readonly');
        const index = tx.store.index('by-timestamp');
        return index.getAll(IDBKeyRange.bound(start, end));
    }

    // Data migration and backup
    async exportData(): Promise<{
        portfolios: Portfolio[];
        positions: (Position & { portfolioId: string })[];
        transactions: Transaction[];
        settings: Record<string, unknown>;
    }> {
        await this.init();

        const [portfolios, positions, transactions] = await Promise.all([
            this.db!.getAll('portfolios'),
            this.db!.getAll('positions'),
            this.db!.getAll('transactions')
        ]);

        const settings = await this.getSetting('activePortfolioId');

        return {
            portfolios,
            positions,
            transactions,
            settings: { activePortfolioId: settings }
        };
    }

    async importData(data: {
        portfolios: Portfolio[];
        positions: (Position & { portfolioId: string })[];
        transactions: Transaction[];
        settings?: Record<string, unknown>;
    }): Promise<void> {
        await this.init();

        const tx = this.db!.transaction(['portfolios', 'positions', 'transactions', 'settings'], 'readwrite');

        // Clear existing data
        await Promise.all([
            tx.objectStore('portfolios').clear(),
            tx.objectStore('positions').clear(),
            tx.objectStore('transactions').clear()
        ]);

        // Import new data
        await Promise.all([
            ...data.portfolios.map(p => tx.objectStore('portfolios').put(p)),
            ...data.positions.map(p => tx.objectStore('positions').put(p)),
            ...data.transactions.map(t => tx.objectStore('transactions').put(t))
        ]);

        if (data.settings?.activePortfolioId) {
            await this.setSetting('activePortfolioId', data.settings.activePortfolioId);
        }
    }

    // Clear all data (for testing/reset)
    async clearAll(): Promise<void> {
        await this.init();
        const tx = this.db!.transaction(['portfolios', 'positions', 'transactions', 'settings'], 'readwrite');

        await Promise.all([
            tx.objectStore('portfolios').clear(),
            tx.objectStore('positions').clear(),
            tx.objectStore('transactions').clear(),
            tx.objectStore('settings').clear()
        ]);
    }
}

// Singleton instance
export const tradingStorage = new TradingStorage();

// Utility functions for common operations
export const storageUtils = {
    // Migrate from localStorage if it exists
    async migrateFromLocalStorage(): Promise<void> {
        const oldData = localStorage.getItem('portfolio-storage');
        if (!oldData) return;

        try {
            const parsed = JSON.parse(oldData);
            if (parsed?.state?.portfolios) {
                await tradingStorage.importData({
                    portfolios: parsed.state.portfolios,
                    positions: parsed.state.portfolios.flatMap((p: Portfolio) =>
                        p.positions.map(pos => ({ ...pos, portfolioId: p.id }))
                    ),
                    transactions: parsed.state.portfolios.flatMap((p: Portfolio) => p.transactions),
                    settings: { activePortfolioId: parsed.state.activePortfolioId }
                });

                // Remove old localStorage data after successful migration
                localStorage.removeItem('portfolio-storage');
                console.log('Successfully migrated data from localStorage to IndexedDB');
            }
        } catch (error) {
            console.error('Failed to migrate from localStorage:', error);
        }
    },

    // Backup to downloadable file
    async downloadBackup(): Promise<void> {
        const data = await tradingStorage.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `trading-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Restore from backup file
    async restoreFromFile(file: File): Promise<void> {
        const text = await file.text();
        const data = JSON.parse(text);
        await tradingStorage.importData(data);
    }
};
