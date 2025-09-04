import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}

const buttonVariants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white border-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700',
    secondary: 'bg-surface hover:bg-surface-hover text-text-primary border-border-primary',
    outline: 'bg-transparent hover:bg-surface-hover text-text-primary border-border-primary hover:border-text-secondary',
    ghost: 'bg-transparent hover:bg-surface-hover text-text-primary border-transparent',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600 dark:bg-red-600 dark:hover:bg-red-700',
};

const buttonSizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    children,
    className,
    disabled,
    ...props
}) => {
    return (
        <motion.button
            whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
            whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
            transition={{ duration: 0.1 }}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                buttonVariants[variant],
                buttonSizes[size],
                className
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                />
            )}
            {!loading && icon && <span className="flex-shrink-0">{icon}</span>}
            <span>{children}</span>
        </motion.button>
    );
};
