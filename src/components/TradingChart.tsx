import React, { useEffect, useRef, useMemo, useState } from 'react';
import { createChart, IChartApi, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { chartApi } from '@/services/chartApi';
import { usePrices } from '@/hooks/usePriceContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import { ChartSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';
import type { CandleRequest } from '@/services/chartApi';

interface TradingChartProps {
    symbol: string;
    className?: string;
    height?: number;
    showToolbar?: boolean;
    onFullscreen?: () => void;
}

const intervals: Array<{ value: CandleRequest['interval']; label: string }> = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' },
];

export const TradingChart: React.FC<TradingChartProps> = ({
    symbol,
    className,
    height = 400,
    showToolbar = true,
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);
    const { getPrice } = usePrices();
    const { theme } = useTheme();

    const [selectedInterval, setSelectedInterval] = useState<CandleRequest['interval']>('4h');

    // Memoize time range to prevent infinite re-renders
    const timeRange = useMemo(() => {
        return chartApi.getTimeRange(selectedInterval, 100);
    }, [selectedInterval]);

    const {
        data: chartData,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['chart-data', symbol, selectedInterval],
        queryFn: () => chartApi.getCandleData({
            coin: symbol,
            interval: selectedInterval,
            startTime: timeRange.startTime,
            endTime: timeRange.endTime,
        }),
        staleTime: 30 * 1000,
        refetchInterval: selectedInterval === '1m' ? 60000 : undefined,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    });

    // Initialize chart
    useEffect(() => {
        const container = chartContainerRef.current;

        if (!container || !chartData?.length) {
            return;
        }

        try {
            // Clean up existing chart
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }

            // Create chart with theme-aware colors
            const chart = createChart(container, {
                width: container.clientWidth,
                height: height,
                layout: {
                    background: { color: 'transparent' },
                    textColor: theme === 'dark' ? '#e5e7eb' : '#374151',
                },
                grid: {
                    vertLines: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
                    horzLines: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
                },
                timeScale: {
                    borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
                    timeVisible: true,
                    secondsVisible: false,
                },
                rightPriceScale: {
                    borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
                },
                crosshair: {
                    mode: 1,
                },
                handleScroll: {
                    mouseWheel: true,
                    pressedMouseMove: true,
                },
                handleScale: {
                    axisPressedMouseMove: true,
                    mouseWheel: true,
                    pinch: true,
                },
            });

            // Add candlestick series
            const candlestickSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            });

            // Add volume series
            const volumeSeries = chart.addSeries(HistogramSeries, {
                color: '#26a69a',
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: 'volume',
            });

            // Configure volume price scale
            chart.priceScale('volume').applyOptions({
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
            });

            // Transform and set data
            const candleData = chartData.map(item => ({

                time: item.time as any,
                open: Number(item.open),
                high: Number(item.high),
                low: Number(item.low),
                close: Number(item.close),
            }));

            const volumeData = chartData.map(item => ({

                time: item.time as any,
                value: Number(item.volume),
                color: Number(item.close) >= Number(item.open) ? '#26a69a' : '#ef5350',
            }));

            candlestickSeries.setData(candleData);
            volumeSeries.setData(volumeData);

            // Store references
            chartRef.current = chart;
            candlestickSeriesRef.current = candlestickSeries;
            volumeSeriesRef.current = volumeSeries;

            // Fit content and enable real-time mode
            setTimeout(() => {
                chart.timeScale().fitContent();
                chart.timeScale().scrollToRealTime();
            }, 100);

            // Handle resize
            const handleResize = () => {
                if (container && chart) {
                    chart.applyOptions({
                        width: container.clientWidth,
                    });
                }
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                if (chart) {
                    chart.remove();
                }
                chartRef.current = null;
                candlestickSeriesRef.current = null;
                volumeSeriesRef.current = null;
            };

        } catch (error) {
            console.error('Error creating chart:', error);
        }
    }, [chartData, symbol, height, theme]);

    // Real-time price updates
    useEffect(() => {
        if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return;

        const currentPrice = getPrice(symbol);
        if (!currentPrice || !chartData?.length) return;

        // Get the latest candle
        const lastCandle = chartData[chartData.length - 1];
        if (!lastCandle) return;

        // Update the last candle with current price
        const updatedCandle = {

            time: lastCandle.time as any,
            open: Number(lastCandle.open),
            high: Math.max(Number(lastCandle.high), currentPrice),
            low: Math.min(Number(lastCandle.low), currentPrice),
            close: currentPrice,
        };

        // Update the chart
        candlestickSeriesRef.current.update(updatedCandle);

        // Scroll to real-time if needed
        if (chartRef.current) {
            chartRef.current.timeScale().scrollToRealTime();
        }
    }, [symbol, chartData, getPrice]);

    if (isLoading) {
        return (
            <ChartSkeleton
                height={height}
                showToolbar={showToolbar}
                className={className}
            />
        );
    }

    if (error) {
        return (
            <div className={cn('bg-surface border border-border-primary rounded-lg p-6', className)}>
                <div className="text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Chart Unavailable</h3>
                    <p className="text-text-secondary mb-4">Failed to load chart data for {symbol}</p>
                    <Button onClick={() => refetch()} size="sm">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    if (!chartData?.length) {
        return (
            <div className={cn('bg-surface border border-border-primary rounded-lg p-6', className)}>
                <div className="text-center">
                    <div className="text-4xl mb-4">📈</div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">No Chart Data</h3>
                    <p className="text-text-secondary mb-4">
                        Chart data is not available for {symbol} on this timeframe
                    </p>
                    <div className="mb-4">
                        <p className="text-sm text-text-secondary mb-2">Try different timeframe:</p>
                        <div className="flex gap-2 justify-center flex-wrap">
                            {intervals.map((interval) => (
                                <Button
                                    key={interval.value}
                                    size="sm"
                                    variant={selectedInterval === interval.value ? 'primary' : 'outline'}
                                    onClick={() => setSelectedInterval(interval.value)}
                                >
                                    {interval.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn('bg-surface border border-border-primary rounded-lg overflow-hidden', className)}
        >
            {showToolbar && (
                <div className="p-4 border-b border-border-primary">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary-500" />
                                {symbol}/USD
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-xs text-text-secondary">Real-time</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {intervals.map((interval) => (
                            <Button
                                key={interval.value}
                                size="sm"
                                variant={selectedInterval === interval.value ? 'primary' : 'outline'}
                                onClick={() => setSelectedInterval(interval.value)}
                            >
                                {interval.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            <div
                ref={chartContainerRef}
                style={{ height }}
                className="w-full h-full bg-background"
            />

            {isLoading && (
                <div className="absolute inset-0 bg-surface bg-opacity-75 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-text-secondary text-sm">Loading chart data...</p>
                    </div>
                </div>
            )}

            {showToolbar && (
                <div className="p-4 border-t border-border-primary bg-background">
                    <div className="grid grid-cols-4 gap-4 text-xs">
                        <div className="text-center">
                            <div className="text-text-secondary mb-1">Open</div>
                            <div className="text-text-primary font-medium">
                                ${chartData?.[chartData.length - 1]?.open || '0'}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-text-secondary mb-1">High</div>
                            <div className="text-text-primary font-medium">
                                ${chartData?.[chartData.length - 1]?.high || '0'}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-text-secondary mb-1">Low</div>
                            <div className="text-text-primary font-medium">
                                ${chartData?.[chartData.length - 1]?.low || '0'}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-text-secondary mb-1">Volume</div>
                            <div className="text-text-primary font-medium">
                                {Number(chartData?.[chartData.length - 1]?.volume || 0).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};