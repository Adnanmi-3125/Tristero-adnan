export interface HyperliquidPriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface HyperliquidWebSocketOptions {
  onPriceUpdate?: (data: Record<string, number>) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class HyperliquidWebSocketClient {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  public options: HyperliquidWebSocketOptions;

  constructor(options: HyperliquidWebSocketOptions = {}) {
    this.options = options;
  }

  private getWebSocketUrl(): string {
    return import.meta.env.VITE_HYPERLIQUID_WS_URL || 'wss://api.hyperliquid.xyz/ws';
  }

  connect(): void {
    if (this.isConnected) return;

    const url = this.getWebSocketUrl();

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribeToAllMids();
        this.options.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.options.onDisconnect?.();

        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.options.onError?.(new Error('WebSocket connection error'));
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.options.onError?.(error as Error);
    }
  }

  private subscribeToAllMids(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const subscribeMessage = {
      method: 'subscribe',
      subscription: {
        type: 'allMids'
      }
    };

    this.ws.send(JSON.stringify(subscribeMessage));
  }

  private handleMessage(data: any): void {

    // Handle Hyperliquid WebSocket message format
    if (data.channel === 'allMids' && data.data && data.data.mids) {
      this.processAllMids(data.data.mids);
    } else if (data.data && data.data.mids) {
      // Handle direct mids data
      this.processAllMids(data.data.mids);
    } else if (data.data && typeof data.data === 'object') {
      // Handle direct price data (fallback)
      this.processAllMids(data.data);
    }
  }

  private processAllMids(midsData: Record<string, string>): void {
    try {

      // Convert string prices to numbers, ignore @ID entries, use actual symbols
      const numericPrices: Record<string, number> = {};
      Object.entries(midsData).forEach(([key, priceStr]) => {
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) {
          // Ignore entries that start with @ (these are asset IDs)
          if (key.startsWith('@')) {
            return; // Skip @ID entries
          }

          // Use the key directly as the symbol name (AVAX, BABY, etc.)
          numericPrices[key] = price;
        }
      });


      if (Object.keys(numericPrices).length > 0) {
        this.options.onPriceUpdate?.(numericPrices);
      }
    } catch (error) {
      console.error('Error processing allMids data:', error);
    }
  }

  private scheduleReconnect(): void {
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts)); // Exponential backoff
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
  }

  getConnectionStatus(): { connected: boolean } {
    return {
      connected: this.isConnected
    };
  }
}

// Singleton instance for global use
let hyperliquidWsClient: HyperliquidWebSocketClient | null = null;

export function createHyperliquidWebSocketClient(options: HyperliquidWebSocketOptions = {}): HyperliquidWebSocketClient {
  if (!hyperliquidWsClient) {
    hyperliquidWsClient = new HyperliquidWebSocketClient(options);
  }
  return hyperliquidWsClient;
}

export function getHyperliquidWebSocketClient(): HyperliquidWebSocketClient | null {
  return hyperliquidWsClient;
}