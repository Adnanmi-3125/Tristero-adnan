import { useContext, useEffect } from 'react';
import { PriceContext } from '@/context/PriceContext';

export function usePrices() {
    const context = useContext(PriceContext);
    if (!context) {
        throw new Error('usePrices must be used within a PriceProvider');
    }
    return context;
}

// Hook for components that need to subscribe to price updates
export function usePriceSubscription(symbol: string, onPriceUpdate: (price: number | null) => void) {
    const context = useContext(PriceContext);

    useEffect(() => {
        if (!context?.subscribe) return;

        const unsubscribe = context.subscribe((prices: Record<string, number>) => {
            const price = prices[symbol] || null;
            onPriceUpdate(price);
        });

        return unsubscribe;
    }, [context, symbol, onPriceUpdate]);
}
