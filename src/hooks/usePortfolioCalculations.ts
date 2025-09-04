import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { Portfolio } from '@/state/portfolioStore';
import type { CalculationRequest, CalculationResponse } from '@/workers/portfolioCalculations.worker';

// Web Worker wrapper with Comlink for better performance
class PortfolioCalculationsWorker {
    private worker: Worker | null = null;
    private messageId = 0;
    private pendingRequests = new Map<number, {
        resolve: (result: unknown) => void;
        reject: (error: Error) => void;
    }>();

    constructor() {
        this.initWorker();
    }

    private initWorker() {
        if (typeof Worker === 'undefined') {
            console.warn('Web Workers not supported');
            return;
        }

        try {
            this.worker = new Worker(
                new URL('../workers/portfolioCalculations.worker.ts', import.meta.url),
                { type: 'module' }
            );

            this.worker.onmessage = (e: MessageEvent<CalculationResponse & { messageId: number }>) => {
                const { messageId, result, error } = e.data;
                const pending = this.pendingRequests.get(messageId);

                if (pending) {
                    this.pendingRequests.delete(messageId);
                    if (error) {
                        pending.reject(new Error(error));
                    } else {
                        pending.resolve(result);
                    }
                }
            };

            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
                // Reject all pending requests
                this.pendingRequests.forEach(({ reject }) => {
                    reject(new Error('Worker error'));
                });
                this.pendingRequests.clear();
            };

        } catch (error) {
            console.error('Failed to initialize worker:', error);
        }
    }

    async calculate<T>(request: CalculationRequest): Promise<T> {
        if (!this.worker) {
            throw new Error('Worker not available');
        }

        return new Promise<T>((resolve, reject) => {
            const messageId = ++this.messageId;
            this.pendingRequests.set(messageId, {
                resolve: (result: unknown) => resolve(result as T),
                reject
            });

            this.worker!.postMessage({
                ...request,
                messageId
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(messageId)) {
                    this.pendingRequests.delete(messageId);
                    reject(new Error('Calculation timeout'));
                }
            }, 10000);
        });
    }

    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pendingRequests.clear();
    }
}

// Singleton worker instance
let workerInstance: PortfolioCalculationsWorker | null = null;

function getWorkerInstance(): PortfolioCalculationsWorker {
    if (!workerInstance) {
        workerInstance = new PortfolioCalculationsWorker();
    }
    return workerInstance;
}

// Hook for portfolio metrics calculation
export const usePortfolioMetrics = (
    portfolio: Portfolio | null,
    currentPrices: Record<string, number>
) => {
    const worker = useRef<PortfolioCalculationsWorker | null>(null);

    useEffect(() => {
        worker.current = getWorkerInstance();
        return () => {
            // Don't destroy the worker on unmount since it's shared
        };
    }, []);

    return useQuery({
        queryKey: ['portfolio-metrics', portfolio?.id, Object.keys(currentPrices).length],
        queryFn: async () => {
            if (!portfolio || !worker.current) return null;

            return await worker.current.calculate({
                type: 'CALCULATE_PORTFOLIO_METRICS',
                data: { portfolio, currentPrices }
            });
        },
        enabled: !!portfolio && Object.keys(currentPrices).length > 0,
        staleTime: 5 * 1000, // 5 seconds
        refetchInterval: 10 * 1000, // Recalculate every 10 seconds
    });
};

// Hook for risk metrics calculation
export const useRiskMetrics = (
    portfolio: Portfolio | null,
    currentPrices: Record<string, number>
) => {
    const worker = useRef<PortfolioCalculationsWorker | null>(null);

    useEffect(() => {
        worker.current = getWorkerInstance();
    }, []);

    return useQuery({
        queryKey: ['risk-metrics', portfolio?.id, Object.keys(currentPrices).length],
        queryFn: async () => {
            if (!portfolio || !worker.current) return null;

            return await worker.current.calculate({
                type: 'CALCULATE_RISK_METRICS',
                data: { portfolio, currentPrices }
            });
        },
        enabled: !!portfolio && Object.keys(currentPrices).length > 0,
        staleTime: 60 * 1000, // 1 minute (risk metrics don't change as frequently)
        refetchInterval: 60 * 1000,
    });
};

// Hook for performance analytics
export const usePerformanceAnalytics = (
    portfolio: Portfolio | null
) => {
    const worker = useRef<PortfolioCalculationsWorker | null>(null);

    useEffect(() => {
        worker.current = getWorkerInstance();
    }, []);

    return useQuery({
        queryKey: ['performance-analytics', portfolio?.id, portfolio?.transactions?.length],
        queryFn: async () => {
            if (!portfolio || !worker.current) return null;

            return await worker.current.calculate({
                type: 'CALCULATE_PERFORMANCE_ANALYTICS',
                data: { portfolio, transactions: portfolio.transactions }
            });
        },
        enabled: !!portfolio,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Cleanup function for app shutdown
export const cleanupWorkers = () => {
    if (workerInstance) {
        workerInstance.destroy();
        workerInstance = null;
    }
};
