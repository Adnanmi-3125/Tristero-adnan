import React, { createContext, useRef, useState, useEffect } from 'react';
import { createHyperliquidWebSocketClient } from '@/services/hyperliquidWebSocket';
import { PriceContextType } from '@/types/priceContext';

const PriceContext = createContext<PriceContextType | null>(null);

export { PriceContext };

export function PriceProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const pricesRef = useRef<Record<string, number>>({});
  const wsClientRef = useRef(createHyperliquidWebSocketClient());
  const subscribersRef = useRef<Set<(prices: Record<string, number>) => void>>(new Set());

  // Initialize WebSocket connection
  useEffect(() => {
    const wsClient = wsClientRef.current;

    // Configure WebSocket callbacks
    wsClient.options = {
      onPriceUpdate: (newPrices: Record<string, number>) => {

        // Update the prices reference
        pricesRef.current = { ...pricesRef.current, ...newPrices };

        // Notify all subscribers about price updates
        subscribersRef.current.forEach(callback => {
          try {
            callback(newPrices);
          } catch (error) {
            console.error('Error in price update callback:', error);
          }
        });
      },
      onConnect: () => {
        setIsConnected(true);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onError: (error: Error) => {
        setIsConnected(false);
        console.error('WebSocket error:', error);
      }
    };

    // Connect to WebSocket
    wsClient.connect();

    return () => {
      wsClient.disconnect();
    };
  }, []);

  // Stable price getter
  const getPrice = (symbol: string): number | null => {
    const price = pricesRef.current[symbol] || null;

    return price;
  };

  // Subscribe to price updates (used by price components)
  const subscribe = (callback: (prices: Record<string, number>) => void) => {
    subscribersRef.current.add(callback);
    return () => subscribersRef.current.delete(callback);
  };

  const contextValue: PriceContextType = {
    getPrice,
    isConnected,
    subscribe,
  };

  return (
    <PriceContext.Provider value={contextValue}>
      {children}
    </PriceContext.Provider>
  );
}

