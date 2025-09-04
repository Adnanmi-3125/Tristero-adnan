import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, CandlestickSeries, ColorType } from 'lightweight-charts';
import { useQuery } from '@tanstack/react-query';
import { chartApi } from '@/services/chartApi';
import { usePrices } from '@/hooks/usePriceContext';
import { useTheme } from '@/context/ThemeContext';
import { Activity } from 'lucide-react';

interface SimpleChartProps {
    symbol: string;
    height?: number;
}

export const SimpleChart: React.FC<SimpleChartProps> = ({ symbol, height = 400 }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<any>(null);
    const { getPrice } = usePrices();
    const { theme } = useTheme();

    // Get chart data
    const timeRange = chartApi.getTimeRange('4h', 100);
    const { data: chartData, isLoading } = useQuery({
        queryKey: ['simple-chart', symbol],
        queryFn: () => chartApi.getCandleData({
            coin: symbol,
            interval: '4h',
            startTime: timeRange.startTime,
            endTime: timeRange.endTime,
        }),
        staleTime: 60 * 1000,
    });

    // Initialize chart when container and data are ready
    useEffect(() => {
        const container = chartContainerRef.current;

        if (!container) {
            return;
        }

        if (!chartData?.length) {
            return;
        }

        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        try {
            // Ensure container has dimensions
            if (container.clientWidth === 0) {
                container.style.width = '100%';
            }
            if (container.clientHeight === 0) {
                container.style.height = `${height}px`;
            }

            const chart = createChart(container, {
                layout: {
                    background: {
                        type: ColorType.Solid,
                        color: theme === 'dark' ? '#1f2937' : '#ffffff'
                    },
                    textColor: theme === 'dark' ? '#d1d5db' : '#374151',
                },
                grid: {
                    vertLines: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
                    horzLines: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
                },
                width: container.clientWidth || 800,
                height: height,
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                    borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                },
                rightPriceScale: {
                    borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                },
            });

            // Add candlestick series - using correct API from documentation
            const candlestickSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            });

            // Transform and set data
            const candleData = chartData.map(item => ({
                time: item.time, // Already in seconds
                open: Number(item.open),
                high: Number(item.high),
                low: Number(item.low),
                close: Number(item.close),
            }));

            candlestickSeries.setData(candleData.map(item => ({
                ...item,
                time: item.time as any
            })));
            candlestickSeriesRef.current = candlestickSeries;

            // Fit content and enable real-time mode
            setTimeout(() => {
                chart.timeScale().fitContent();
                chart.timeScale().scrollToRealTime();
            }, 100);

            chartRef.current = chart;

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
            };

        } catch (error) {
            console.error('Error creating chart:', error);
        }
    }, [chartData, symbol, height]);

    // Real-time price updates
    useEffect(() => {
        if (!candlestickSeriesRef.current || !chartData?.length) {
            return;
        }

        const latestCandle = chartData[chartData.length - 1];
        const currentTime = Math.floor(Date.now() / 1000);

        let currentCandle = {
            time: currentTime,
            open: latestCandle.close,
            high: latestCandle.close,
            low: latestCandle.close,
            close: latestCandle.close,
        };

        const updateInterval = setInterval(() => {
            const currentPrice = getPrice(symbol);

            if (currentPrice && currentPrice !== currentCandle.close) {
                currentCandle = {
                    time: currentCandle.time,
                    open: currentCandle.open,
                    high: Math.max(currentCandle.high, currentPrice),
                    low: Math.min(currentCandle.low, currentPrice),
                    close: currentPrice,
                };

                try {
                    candlestickSeriesRef.current.update(currentCandle);
                    if (chartRef.current) {
                        chartRef.current.timeScale().scrollToRealTime();
                    }
                } catch (error) {
                    console.error('Error updating chart:', error);
                }
            }
        }, 1000);

        return () => {
            clearInterval(updateInterval);
        };
    }, [chartData, symbol, getPrice]);

    if (isLoading) {
        return (
            <div
                className="bg-surface rounded-lg flex items-center justify-center border border-border-primary"
                style={{ height: `${height}px` }}
            >
                <div className="text-text-secondary">Loading chart...</div>
            </div>
        );
    }

    if (!chartData?.length) {
        return (
            <div
                className="bg-surface rounded-lg flex items-center justify-center border border-border-primary"
                style={{ height: `${height}px` }}
            >
                <div className="text-text-secondary">No chart data available for {symbol}</div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Real-time indicator */}
            <div className="flex items-center gap-1 text-sm text-text-secondary">
                <Activity className="w-4 h-4 text-green-400" />
                <span>Live Chart</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>

            {/* Chart container */}
            <div
                ref={chartContainerRef}
                className="w-full bg-surface rounded-lg border border-border-primary"
                style={{ height: `${height}px` }}
            />
        </div>
    );
};
