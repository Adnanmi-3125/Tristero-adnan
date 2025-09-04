import React, { useRef, useEffect, useContext } from 'react';
import { usePrices } from '@/hooks/usePriceContext';
import { PriceContext } from '@/context/PriceContext';

interface LivePriceValueProps {
    symbol: string;
    quantity?: number;
    fallbackPrice?: number;
    className?: string;
    decimals?: number;
    showCurrency?: boolean;
    operation?: 'multiply' | 'subtract' | 'add';
    operand?: number;
}

// Component that shows live-updating calculated values based on price changes
export const LivePriceValue = React.memo<LivePriceValueProps>(({
    symbol,
    quantity,
    fallbackPrice,
    className = "font-mono text-text-primary",
    decimals = 2,
    showCurrency = true,
    operation,
    operand
}) => {
    const spanRef = useRef<HTMLSpanElement>(null);
    const { getPrice } = usePrices();
    const context = useContext(PriceContext);
    const lastValueRef = useRef<number | null>(null);

    useEffect(() => {
        if (!spanRef.current) return;

        // Calculate initial value
        const initialPrice = getPrice(symbol) || fallbackPrice || 0;
        const initialValue = calculateValue(initialPrice);
        updateValueDisplay(initialValue);
        lastValueRef.current = initialValue;

        // Subscribe to price updates
        let unsubscribe: (() => void) | null = null;

        if (context?.subscribe) {
            unsubscribe = context.subscribe((prices: Record<string, number>) => {
                const newPrice = prices[symbol];
                if (newPrice !== undefined) {
                    const newValue = calculateValue(newPrice);
                    if (newValue !== lastValueRef.current) {
                        updateValueDisplay(newValue);
                        lastValueRef.current = newValue;
                    }
                }
            });
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [symbol, quantity, fallbackPrice, getPrice, context, operation, operand]);

    const calculateValue = (price: number): number => {
        let value = price;

        // Apply quantity multiplication if provided
        if (quantity !== undefined) {
            value *= quantity;
        }

        // Apply operation if provided
        if (operation && operand !== undefined) {
            switch (operation) {
                case 'multiply':
                    value *= operand;
                    break;
                case 'subtract':
                    value -= operand;
                    break;
                case 'add':
                    value += operand;
                    break;
            }
        }

        return value;
    };

    const updateValueDisplay = (value: number) => {
        if (!spanRef.current) return;

        const actualDecimals = value > 1 ? Math.min(decimals, 2) : Math.max(decimals, 4);
        const formatted = value.toLocaleString('en-US', {
            minimumFractionDigits: actualDecimals,
            maximumFractionDigits: actualDecimals,
        });

        spanRef.current.textContent = `${showCurrency ? '$' : ''}${formatted}`;
    };

    // Initial render
    const initialPrice = fallbackPrice || 0;
    const initialValue = calculateValue(initialPrice);
    const actualDecimals = initialValue > 1 ? Math.min(decimals, 2) : Math.max(decimals, 4);
    const initialFormatted = initialValue.toLocaleString('en-US', {
        minimumFractionDigits: actualDecimals,
        maximumFractionDigits: actualDecimals,
    });

    return (
        <span ref={spanRef} className={className}>
            {showCurrency ? '$' : ''}{initialFormatted}
        </span>
    );
});

LivePriceValue.displayName = 'LivePriceValue';
