import React, { useState, useEffect, useCallback } from 'react';
import { CryptoAsset } from '@/types/trading';
import { usePortfolioStore } from '@/state/portfolioStore';
import { usePrices, usePriceSubscription } from '@/hooks/usePriceContext';
import { PriceDisplay } from '@/components/PriceDisplay';
import { formatCurrency } from '@/utils/calculations';

interface TradingFormProps {
  selectedAsset: CryptoAsset;
  onTradeExecuted?: () => void;
}

type TradeType = 'buy' | 'sell';

export const TradingForm = React.memo<TradingFormProps>(({
  selectedAsset,
  onTradeExecuted
}) => {
  const [tradeType, setTradeType] = useState<TradeType>('buy');
  const [quantity, setQuantity] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [livePrice, setLivePrice] = useState<number>(selectedAsset.price);

  const { getActivePortfolio, executeTrade } = usePortfolioStore();
  const { getPrice } = usePrices();

  const activePortfolio = getActivePortfolio();
  const quantityNum = parseFloat(quantity) || 0;
  const totalValue = quantityNum * livePrice;

  // Subscribe to live price updates for this specific asset
  const handlePriceUpdate = useCallback((newPrice: number | null) => {
    if (newPrice !== null && newPrice > 0) {
      setLivePrice(newPrice);
    }
  }, []);

  usePriceSubscription(selectedAsset.symbol, handlePriceUpdate);

  // Initialize with current price
  useEffect(() => {
    const currentPrice = getPrice(selectedAsset.symbol);
    if (currentPrice && currentPrice > 0) {
      setLivePrice(currentPrice);
    }
  }, [selectedAsset.symbol, getPrice]);

  // Find existing position for this asset
  const existingPosition = activePortfolio?.positions.find(
    pos => pos.symbol === selectedAsset.symbol
  );

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const validateTrade = (): string | null => {
    if (!activePortfolio) return 'No active portfolio selected';
    if (!quantity || quantityNum <= 0) return 'Please enter a valid quantity';
    if (!livePrice || livePrice <= 0) return 'Invalid price data';

    if (tradeType === 'buy') {
      if (totalValue > activePortfolio.balance) {
        return `Insufficient funds. Available: ${formatCurrency(activePortfolio.balance)}`;
      }
    } else if (tradeType === 'sell') {
      if (!existingPosition) {
        return `No ${selectedAsset.symbol} position to sell`;
      }
      if (quantityNum > existingPosition.quantity) {
        return `Insufficient quantity. Available: ${existingPosition.quantity}`;
      }
    }

    return null;
  };

  const handleExecuteTrade = async () => {
    const validationError = validateTrade();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsExecuting(true);
    setError('');

    try {
      const success = executeTrade({
        symbol: selectedAsset.symbol,
        type: tradeType,
        quantity: quantityNum,
        price: livePrice,
      });

      if (success) {
        setSuccess(
          `${tradeType.toUpperCase()} order executed: ${quantity} ${selectedAsset.symbol} at ${formatCurrency(livePrice)}`
        );
        setQuantity('');
        onTradeExecuted?.();
      } else {
        setError('Trade execution failed');
      }
    } catch (err) {
      setError('An error occurred while executing the trade');
      console.error('Trade execution error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const getMaxQuantity = (): number => {
    if (!activePortfolio) return 0;

    if (tradeType === 'buy') {
      return Math.floor(activePortfolio.balance / livePrice * 100) / 100;
    } else {
      return existingPosition?.quantity || 0;
    }
  };

  const handleMaxClick = () => {
    const maxQty = getMaxQuantity();
    setQuantity(maxQty.toString());
  };

  if (!activePortfolio) {
    return (
      <div className="bg-surface border border-border-primary rounded-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2 text-text-primary">No Portfolio Selected</h3>
          <p className="text-text-secondary">
            Please create or select a portfolio to start trading
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-primary rounded-lg p-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-text-primary">Trade {selectedAsset.symbol}</h3>
        <p className="text-sm text-text-secondary">{selectedAsset.name}</p>
      </div>

      {/* Current Price */}
      <div className="bg-surface-hover rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-text-secondary">Current Price:</span>
          <span className="text-text-primary font-mono font-semibold">
            <PriceDisplay
              symbol={selectedAsset.symbol}
              fallbackPrice={selectedAsset.price}
              decimals={selectedAsset.price > 1 ? 2 : 6}
              className="text-text-primary font-mono font-semibold"
            />
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Available Balance:</span>
          <span className="text-green-400 font-mono">
            {formatCurrency(activePortfolio.balance)}
          </span>
        </div>
        {existingPosition && (
          <div className="flex justify-between items-center mt-2">
            <span className="text-text-secondary">Current Position:</span>
            <span className="text-blue-400 font-mono">
              {existingPosition.quantity} {selectedAsset.symbol}
            </span>
          </div>
        )}
      </div>

      {/* Trade Type Selection */}
      <div className="flex mb-4">
        <button
          onClick={() => setTradeType('buy')}
          className={`flex-1 py-2 px-4 rounded-l-md font-medium transition-colors ${tradeType === 'buy'
            ? 'bg-green-600 text-white'
            : 'bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
        >
          Buy
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={`flex-1 py-2 px-4 rounded-r-md font-medium transition-colors ${tradeType === 'sell'
            ? 'bg-red-600 text-white'
            : 'bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
        >
          Sell
        </button>
      </div>

      {/* Order Type (Market only for now) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Order Type
        </label>
        <div className="bg-surface border border-border-primary rounded-md p-2 text-center text-text-secondary">
          Market Order (Immediate Execution)
        </div>
      </div>

      {/* Quantity Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Quantity
        </label>
        <div className="flex">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="flex-1 bg-background border border-border-primary rounded-l-md px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            onClick={handleMaxClick}
            className="bg-surface border border-border-primary border-l-0 rounded-r-md px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            Max
          </button>
        </div>
        {quantityNum > 0 && (
          <div className="mt-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Total:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-text-primary font-semibold">
                  {formatCurrency(totalValue)}
                </span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live pricing"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded-md text-red-200 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-900 border border-green-600 rounded-md text-green-200 text-sm">
          {success}
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={handleExecuteTrade}
        disabled={isExecuting || !quantity || quantityNum <= 0}
        className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${tradeType === 'buy'
          ? 'bg-green-600 hover:bg-green-700 disabled:bg-surface'
          : 'bg-red-600 hover:bg-red-700 disabled:bg-surface'
          } text-white disabled:text-text-secondary disabled:cursor-not-allowed`}
      >
        {isExecuting
          ? 'Executing...'
          : `${tradeType.toUpperCase()} ${selectedAsset.symbol}`
        }
      </button>

      {/* Order Summary */}
      {quantityNum > 0 && (
        <div className="mt-4 p-3 bg-surface border border-border-primary rounded-md text-sm">
          <div className="text-text-secondary mb-2">Order Summary:</div>
          <div className="flex justify-between text-text-primary">
            <span>{tradeType.toUpperCase()} {quantity} {selectedAsset.symbol}</span>
            <span>{formatCurrency(totalValue)}</span>
          </div>
        </div>
      )}
    </div>
  );
});

TradingForm.displayName = 'TradingForm';