import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Star, StarOff, ExternalLink, Activity } from 'lucide-react';
import { SimpleChart } from '@/components/SimpleChart';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatPercentage } from '@/utils/calculations';
import { PriceDisplay } from '@/components/PriceDisplay';
import { cn } from '@/utils/cn';
import type { CryptoAsset } from '@/types/trading';

interface AssetDetailModalProps {
    asset: CryptoAsset | null;
    isOpen: boolean;
    onClose: () => void;
    onTrade?: (asset: CryptoAsset) => void;
    className?: string;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
    asset,
    isOpen,
    onClose,
    onTrade,
    className,
}) => {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!asset) return null;

    const priceChangeColor = asset.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400';
    const priceChangeBg = asset.changePercent24h >= 0 ? 'bg-green-900' : 'bg-red-900';


    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            'w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] bg-surface border border-border-primary rounded-xl shadow-2xl overflow-hidden mx-2 sm:mx-0',
                            className
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 sm:p-6 border-b border-border-primary bg-surface">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.1 }}
                                        className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm sm:text-lg font-bold"
                                    >
                                        {asset.symbol.slice(0, 2)}
                                    </motion.div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-text-primary">{asset.symbol}</h2>
                                        <p className="text-sm text-text-secondary">{asset.name}</p>
                                    </div>

                                </div>

                                <div className="flex items-center gap-3">
                                    <motion.div
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-right"
                                    >
                                        <div className="text-xl sm:text-2xl font-bold text-text-primary">
                                            <PriceDisplay
                                                symbol={asset.symbol}
                                                fallbackPrice={asset.price}
                                                decimals={asset.price > 1 ? 2 : 6}
                                                className="text-xl sm:text-2xl font-bold text-text-primary"
                                            />
                                        </div>
                                        <div className={`text-xs sm:text-sm ${priceChangeColor}`}>
                                            {asset.changePercent24h >= 0 ? '+' : ''}
                                            {formatCurrency(asset.change24h)}
                                        </div>
                                    </motion.div>

                                    {/* Favorite button remove text for mobile */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsFavorite(!isFavorite)}
                                        icon={isFavorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                                        className=" gap-0 sm:gap-2"
                                    >
                                        <span className="hidden sm:inline">{isFavorite ? 'Favorited' : 'Favorite'}</span>
                                    </Button>

                                    {/* Just show close icon for mobile no text */}
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        icon={<X className="w-4 h-4" />}
                                        className="gap-0 sm:gap-2"
                                    >
                                        <span className="hidden sm:inline">Close</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Live Chart Header */}
                            <div className="flex items-center gap-2 mt-6">
                                <Activity className="w-5 h-5 text-primary-500" />
                                <h3 className="text-lg font-semibold text-text-primary">Live Price Chart</h3>
                                <div className="ml-auto flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-text-secondary">Real-time</span>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <SimpleChart symbol={asset.symbol} height={isMobile ? 300 : 450} />
                            </motion.div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 sm:p-6 border-t border-border-primary bg-surface">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                                <div className="text-xs sm:text-sm text-text-secondary">
                                    Real-time data • Last updated: {new Date().toLocaleTimeString()}
                                </div>
                                <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(`https://coinmarketcap.com/currencies/${asset.symbol.toLowerCase()}`, '_blank')}
                                        icon={<ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />}
                                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                                    >
                                        <span className="hidden sm:inline">View on CMC</span>
                                        <span className="sm:hidden">CMC</span>
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => onTrade?.(asset)}
                                        icon={<Activity className="w-3 h-3 sm:w-4 sm:h-4" />}
                                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                                    >
                                        <span className="hidden sm:inline">Start Trading</span>
                                        <span className="sm:hidden">Trade</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
