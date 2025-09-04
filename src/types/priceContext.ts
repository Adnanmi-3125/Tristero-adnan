export interface PriceContextType {
    getPrice: (symbol: string) => number | null;
    isConnected: boolean;
    subscribe?: (callback: (prices: Record<string, number>) => void) => () => void;
}
