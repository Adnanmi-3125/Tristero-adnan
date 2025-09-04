import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    variant?: 'default' | 'elevated' | 'outlined';
}

const paddingVariants = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
};

const cardVariants = {
    default: 'bg-surface border border-border-primary',
    elevated: 'bg-surface border border-border-primary shadow-lg',
    outlined: 'bg-transparent border-2 border-border-primary',
};

export const Card: React.FC<CardProps> = ({
    children,
    className,
    hover = false,
    padding = 'md',
    variant = 'default',
}) => {
    const CardComponent = hover ? motion.div : 'div';

    const motionProps = hover ? {
        whileHover: { scale: 1.02, y: -2 },
        transition: { duration: 0.2 }
    } : {};

    return (
        <CardComponent
            className={cn(
                'rounded-lg transition-colors',
                cardVariants[variant],
                paddingVariants[padding],
                hover && 'cursor-pointer hover:border-text-secondary',
                className
            )}
            {...motionProps}
        >
            {children}
        </CardComponent>
    );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className,
}) => (
    <div className={cn('mb-4', className)}>
        {children}
    </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className,
}) => (
    <h3 className={cn('text-lg font-semibold text-text-primary', className)}>
        {children}
    </h3>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className,
}) => (
    <div className={className}>
        {children}
    </div>
);
