import React, { useEffect, useRef, useContext, useState, useCallback } from 'react';
import { usePrices, usePriceSubscription } from '@/hooks/usePriceContext';
import { PriceContext } from '@/context/PriceContext';

interface PriceDisplayProps {
  symbol: string;
  className?: string;
  decimals?: number;
  showCurrency?: boolean;
  fallbackPrice?: number;
  format?: 'currency' | 'percentage' | 'raw';
}

export const PriceDisplay = React.memo<PriceDisplayProps>(({
  symbol,
  className = "font-mono text-white",
  decimals = 2,
  showCurrency = true,
  fallbackPrice,
  format = 'currency'
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const { getPrice } = usePrices();
  const context = useContext(PriceContext);
  const lastPriceRef = useRef<number | null>(null);
  const lastFormattedRef = useRef<string>('');

  useEffect(() => {
    if (!spanRef.current) return;

    // Set initial price
    const initialPrice = getPrice(symbol) || fallbackPrice || null;
    if (initialPrice !== null) {
      updateDisplay(initialPrice);
      lastPriceRef.current = initialPrice;
    }

    // Subscribe to price updates
    let unsubscribe: (() => void) | null = null;

    if (context?.subscribe) {
      unsubscribe = context.subscribe((prices: Record<string, number>) => {
        const newPrice = prices[symbol];
        if (newPrice !== undefined && newPrice !== lastPriceRef.current) {
          updateDisplay(newPrice);
          lastPriceRef.current = newPrice;
        }
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [symbol, fallbackPrice, getPrice, context, decimals, showCurrency, format]);

  const updateDisplay = (price: number) => {
    if (!spanRef.current) return;

    let formatted: string;

    switch (format) {
      case 'percentage':
        formatted = `${price >= 0 ? '+' : ''}${price.toFixed(2)}%`;
        break;
      case 'raw':
        formatted = price.toString();
        break;
      case 'currency':
      default: {
        const actualDecimals = price > 1 ? Math.min(decimals, 2) : Math.max(decimals, 4);
        const priceFormatted = price.toLocaleString('en-US', {
          minimumFractionDigits: actualDecimals,
          maximumFractionDigits: actualDecimals,
        });
        formatted = `${showCurrency ? '$' : ''}${priceFormatted}`;
        break;
      }
    }

    // Only update DOM if the formatted value actually changed
    if (formatted !== lastFormattedRef.current) {
      spanRef.current.textContent = formatted;
      lastFormattedRef.current = formatted;
    }
  };

  // Initial render
  const initialPrice = fallbackPrice || 0;
  let initialFormatted: string;

  switch (format) {
    case 'percentage':
      initialFormatted = `${initialPrice >= 0 ? '+' : ''}${initialPrice.toFixed(2)}%`;
      break;
    case 'raw':
      initialFormatted = initialPrice.toString();
      break;
    case 'currency':
    default: {
      const actualDecimals = initialPrice > 1 ? Math.min(decimals, 2) : Math.max(decimals, 4);
      const priceFormatted = initialPrice.toLocaleString('en-US', {
        minimumFractionDigits: actualDecimals,
        maximumFractionDigits: actualDecimals,
      });
      initialFormatted = `${showCurrency ? '$' : ''}${priceFormatted}`;
      break;
    }
  }

  return (
    <span ref={spanRef} className={className}>
      {initialFormatted || '--'}
    </span>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.className === nextProps.className &&
    prevProps.decimals === nextProps.decimals &&
    prevProps.showCurrency === nextProps.showCurrency &&
    prevProps.fallbackPrice === nextProps.fallbackPrice &&
    prevProps.format === nextProps.format
  );
});

PriceDisplay.displayName = 'PriceDisplay';

// Additional variant for change display
export const PriceChangeDisplay = React.memo<{
  symbol: string;
  className?: string;
  fallbackPrice?: number;
  previousPrice?: number;
}>(({
  symbol,
  className = "font-mono",
  fallbackPrice,
  previousPrice
}) => {
  const { getPrice } = usePrices();
  const [currentPrice, setCurrentPrice] = useState<number | null>(() =>
    getPrice(symbol) || fallbackPrice || null
  );
  const [prevPrice, setPrevPrice] = useState<number | null>(previousPrice || null);

  const onPriceUpdate = useCallback((price: number | null) => {
    if (price !== null && currentPrice !== null) {
      setPrevPrice(currentPrice);
    }
    setCurrentPrice(price || fallbackPrice || null);
  }, [currentPrice, fallbackPrice]);

  usePriceSubscription(symbol, onPriceUpdate);

  useEffect(() => {
    const price = getPrice(symbol);
    if (price !== null) {
      setCurrentPrice(price);
    }
  }, [getPrice, symbol]);

  if (currentPrice === null || prevPrice === null) {
    return <span className={className}>0.00%</span>;
  }

  const changePercent = ((currentPrice - prevPrice) / prevPrice) * 100;
  const colorClass = changePercent >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <span className={`${className} ${colorClass}`}>
      {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
    </span>
  );
});

PriceChangeDisplay.displayName = 'PriceChangeDisplay';