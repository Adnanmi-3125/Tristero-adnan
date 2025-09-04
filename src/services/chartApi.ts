
export interface CandleRequest {
    coin: string;
    interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
    startTime: number;
    endTime: number;
}

export interface CandleResponse {
    T?: number[]; // timestamps
    c?: string[]; // close prices
    h?: string[]; // high prices
    l?: string[]; // low prices
    o?: string[]; // open prices
    v?: string[]; // volumes
    // Alternative property names
    t?: number[];
    time?: number[];
    timestamp?: number[];
    open?: string[];
    high?: string[];
    low?: string[];
    close?: string[];
    volume?: string[];
    [key: string]: any;
}

export interface ChartDataPoint {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

class HyperliquidChartAPI {
    private readonly baseUrl = import.meta.env.VITE_HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz/info';
    private cache = new Map<string, { data: ChartDataPoint[]; timestamp: number }>();
    private readonly CACHE_DURATION = 30 * 1000;

    private getCacheKey(req: CandleRequest): string {
        // Round timestamps to make cache keys more stable
        const roundedStart = Math.floor(req.startTime / (60 * 1000)) * (60 * 1000);
        const roundedEnd = Math.floor(req.endTime / (60 * 1000)) * (60 * 1000);
        return `${req.coin}-${req.interval}-${roundedStart}-${roundedEnd}`;
    }

    async getCandleData(req: CandleRequest): Promise<ChartDataPoint[]> {
        const cacheKey = this.getCacheKey(req);
        const cached = this.cache.get(cacheKey);

        // Return cached data if still valid
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }


        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'candleSnapshot',
                    req,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }

            const rawData = await response.json();

            // Handle the actual Hyperliquid API format (array of candle objects)
            if (Array.isArray(rawData)) {
                if (rawData.length === 0) {
                    return [];
                }

                // Transform array of candle objects to our ChartDataPoint format
                const chartData: ChartDataPoint[] = rawData
                    .filter((candle: any) => {
                        // Filter out incomplete or invalid candles
                        return candle &&
                            (candle.t || candle.T) &&
                            candle.o && candle.h && candle.l && candle.c;
                    })
                    .map((candle: any) => {
                        // Hyperliquid format: {t: timestamp, o: open, h: high, l: low, c: close, v: volume}
                        const timestamp = candle.t || candle.T;
                        const time = Math.floor(timestamp / 1000); // Convert milliseconds to seconds

                        const open = parseFloat(candle.o);
                        const high = parseFloat(candle.h);
                        const low = parseFloat(candle.l);
                        const close = parseFloat(candle.c);
                        const volume = parseFloat(candle.v || '0');

                        // Validate OHLC data
                        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
                            return null;
                        }

                        return {
                            time,
                            open,
                            high: Math.max(high, open, close), // Ensure high is actually highest
                            low: Math.min(low, open, close),   // Ensure low is actually lowest
                            close,
                            volume: Math.max(0, volume), // Ensure volume is non-negative
                        };
                    })
                    .filter((candle): candle is ChartDataPoint => candle !== null) // Remove null entries
                    .sort((a, b) => a.time - b.time); // Sort chronologically

                // Cache and return the data directly
                this.cache.set(cacheKey, {
                    data: chartData,
                    timestamp: Date.now(),
                });

                return chartData;
            } else {
                // Handle legacy format (object with arrays) - keeping for compatibility
                const data = rawData;

                // Check if the API returned valid data structure
                if (!data || typeof data !== 'object') {
                    console.warn(`Invalid data structure for ${req.coin}:`, data);
                    return [];
                }

                // Check for required fields with flexible property names
                const timestamps = data.T || data.t || data.time || data.timestamp;
                const opens = data.o || data.open;
                const highs = data.h || data.high;
                const lows = data.l || data.low;
                const closes = data.c || data.close;
                const volumes = data.v || data.volume;

                if (!timestamps || !Array.isArray(timestamps) || timestamps.length === 0) {
                    console.warn(`No timestamps found for ${req.coin}. Available keys:`, Object.keys(data));
                    return [];
                }


                // Create normalized data structure
                const normalizedData: CandleResponse = {
                    T: timestamps,
                    o: opens || [],
                    h: highs || [],
                    l: lows || [],
                    c: closes || [],
                    v: volumes || []
                };

                const chartData = this.transformCandleData(normalizedData);

                // Cache the result
                this.cache.set(cacheKey, {
                    data: chartData,
                    timestamp: Date.now(),
                });

                return chartData;
            }
        } catch (error) {
            throw new Error(`Failed to load chart data for ${req.coin}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private transformCandleData(data: CandleResponse): ChartDataPoint[] {
        const { T, o, h, l, c, v } = data;

        if (!T || !Array.isArray(T)) {
            return [];
        }

        return T.map((timestamp, index) => {
            // Handle missing data gracefully
            const open = o && o[index] ? parseFloat(o[index]) : 0;
            const high = h && h[index] ? parseFloat(h[index]) : open;
            const low = l && l[index] ? parseFloat(l[index]) : open;
            const close = c && c[index] ? parseFloat(c[index]) : open;
            const volume = v && v[index] ? parseFloat(v[index]) : 0;

            return {
                time: timestamp / 1000, // Convert to seconds for lightweight-charts
                open,
                high: Math.max(high, open, close), // Ensure high is actually high
                low: Math.min(low, open, close),   // Ensure low is actually low
                close,
                volume,
            };
        })
            .filter(candle => candle.time > 0 && !isNaN(candle.open)) // Filter out invalid data
            .sort((a, b) => a.time - b.time);
    }

    // Get different time ranges (rounded to prevent constant changes)
    getTimeRange(interval: CandleRequest['interval'], periods: number = 100): {
        startTime: number;
        endTime: number;
    } {
        const intervalMs = this.getIntervalMs(interval);
        const now = Date.now();

        // Ensure we're requesting PAST data, not future data
        // Round down to the most recent completed interval
        const roundedNow = Math.floor(now / intervalMs) * intervalMs;
        const startTime = roundedNow - (periods * intervalMs);


        return {
            startTime,
            endTime: roundedNow,
        };
    }

    private getIntervalMs(interval: CandleRequest['interval']): number {
        const intervals = {
            '1m': 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000,
        };
        return intervals[interval];
    }

    // Clear cache
    clearCache(): void {
        this.cache.clear();
    }

    // Get cache stats
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }

}

export const chartApi = new HyperliquidChartAPI();


