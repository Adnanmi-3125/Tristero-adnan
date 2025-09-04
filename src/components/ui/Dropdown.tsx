import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DropdownOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface DropdownProps {
    options: DropdownOption[];
    value?: string;
    placeholder?: string;
    onChange: (value: string) => void;
    className?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const Dropdown: React.FC<DropdownProps> = ({
    options,
    value,
    placeholder = "Select option...",
    onChange,
    className,
    disabled = false,
    size = 'md'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-4 py-3 text-base'
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    'w-full bg-surface border border-border-primary rounded-lg',
                    'flex items-center justify-between',
                    'text-left text-text-primary font-medium',
                    'hover:bg-surface-hover hover:border-primary-500',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                    'transition-all duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    sizeClasses[size]
                )}
            >
                <span className={cn(
                    selectedOption ? 'text-text-primary' : 'text-text-secondary'
                )}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown
                    className={cn(
                        'w-4 h-4 text-text-secondary transition-transform duration-200',
                        isOpen && 'rotate-180'
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 w-full mt-1 bg-surface border border-border-primary rounded-lg shadow-xl"
                    >
                        <div className="py-1 max-h-60 overflow-y-auto">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => !option.disabled && handleSelect(option.value)}
                                    disabled={option.disabled}
                                    className={cn(
                                        'w-full px-4 py-2 text-left flex items-center justify-between',
                                        'hover:bg-surface-hover transition-colors duration-150',
                                        'disabled:opacity-50 disabled:cursor-not-allowed',
                                        option.value === value && 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                                    )}
                                >
                                    <span className="text-sm text-text-primary">{option.label}</span>
                                    {option.value === value && (
                                        <Check className="w-4 h-4 text-primary-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
