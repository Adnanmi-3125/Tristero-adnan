import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface SkeletonProps {
    className?: string;
    variant?: 'default' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className,
    variant = 'default',
    width,
    height,
    animate = true,
}) => {
    const baseClasses = 'bg-surface-hover';

    const variantClasses = {
        default: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-none',
    };

    const skeletonElement = (
        <div
            className={cn(
                baseClasses,
                variantClasses[variant],
                className
            )}
            style={{ width, height }}
        />
    );

    if (!animate) {
        return skeletonElement;
    }

    return (
        <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className={cn(
                baseClasses,
                variantClasses[variant],
                className
            )}
            style={{ width, height }}
        />
    );
};

// Specialized skeleton components
export const ChartSkeleton: React.FC<{
    className?: string;
    height?: number;
    showToolbar?: boolean
}> = ({
    className,
    height = 400,
    showToolbar = true
}) => (
        <div className={cn('bg-surface border border-border-primary rounded-lg overflow-hidden', className)} style={{ height }}>
            <div className="animate-pulse h-full flex flex-col">
                {/* Chart toolbar */}
                {showToolbar && (
                    <div className="p-4 border-b border-border-primary">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 bg-surface-hover rounded"></div>
                                <div className="h-6 bg-surface-hover rounded w-24"></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-surface-hover rounded-full"></div>
                                <div className="h-4 bg-surface-hover rounded w-16"></div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-8 bg-surface-hover rounded w-12"></div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chart area */}
                <div className="flex-1 relative bg-background p-4">
                    {/* Grid lines */}
                    <div className="absolute inset-4 opacity-30">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={`h-${i}`}
                                className="absolute left-0 right-0 h-px bg-surface-hover"
                                style={{ top: `${i * 25}%` }}
                            ></div>
                        ))}
                        {[...Array(7)].map((_, i) => (
                            <div
                                key={`v-${i}`}
                                className="absolute top-0 bottom-0 w-px bg-surface-hover"
                                style={{ left: `${i * 16.66}%` }}
                            ></div>
                        ))}
                    </div>

                    {/* Chart bars */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                        {[...Array(30)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: Math.random() * 80 + 10 }}
                                transition={{ delay: i * 0.02, duration: 0.6 }}
                                className="bg-surface-hover rounded-t opacity-60"
                                style={{ width: '2px' }}
                            />
                        ))}
                    </div>
                </div>

                {/* Chart stats footer */}
                {showToolbar && (
                    <div className="p-4 border-t border-border-primary bg-background">
                        <div className="grid grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="text-center">
                                    <div className="h-3 bg-surface-hover rounded w-12 mx-auto mb-1"></div>
                                    <div className="h-4 bg-surface-hover rounded w-16 mx-auto"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

export const AssetCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn('p-4 bg-surface rounded-lg border border-border-primary', className)}>
        <div className="flex items-center gap-3 mb-3">
            <Skeleton variant="circular" width={32} height={32} />
            <div className="flex-1">
                <Skeleton width={80} height={16} className="mb-2" />
                <Skeleton width={120} height={12} />
            </div>
            <Skeleton width={60} height={20} />
        </div>
        <div className="flex justify-between items-center">
            <Skeleton width={100} height={24} />
            <Skeleton width={80} height={16} />
        </div>
    </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
    rows = 5,
    columns = 4,
    className,
}) => (
    <div className={cn('space-y-2', className)}>
        {/* Header */}
        <div className="flex gap-4 p-3 bg-surface rounded">
            {Array.from({ length: columns }, (_, i) => (
                <Skeleton key={i} width={100} height={16} />
            ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }, (_, i) => (
            <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-3 bg-surface rounded"
            >
                {Array.from({ length: columns }, (_, j) => (
                    <Skeleton key={j} width={80 + Math.random() * 40} height={16} />
                ))}
            </motion.div>
        ))}
    </div>
);
