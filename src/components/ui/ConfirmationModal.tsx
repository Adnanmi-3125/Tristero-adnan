import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/utils/cn';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    details?: string[];
    children?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning',
    details = [],
    children
}) => {
    const iconMap = {
        danger: XCircle,
        warning: AlertTriangle,
        info: CheckCircle,
        success: CheckCircle
    };

    const colorMap = {
        danger: 'text-red-500',
        warning: 'text-yellow-500',
        info: 'text-blue-500',
        success: 'text-green-500'
    };

    const Icon = iconMap[type];

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-surface border border-border-primary rounded-xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-border-primary">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    'w-12 h-12 rounded-full flex items-center justify-center',
                                    type === 'danger' && 'bg-red-100 dark:bg-red-900/20',
                                    type === 'warning' && 'bg-yellow-100 dark:bg-yellow-900/20',
                                    type === 'info' && 'bg-blue-100 dark:bg-blue-900/20',
                                    type === 'success' && 'bg-green-100 dark:bg-green-900/20'
                                )}>
                                    <Icon className={cn('w-6 h-6', colorMap[type])} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                                    <p className="text-sm text-text-secondary mt-1">{message}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-text-secondary hover:text-text-primary transition-colors p-1"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        {(details.length > 0 || children) && (
                            <div className="border-b border-border-primary">
                                {children && (
                                    <div>{children}</div>
                                )}
                                {details.length > 0 && (
                                    <div className="p-6">
                                        <div className="space-y-2">
                                            {details.map((detail, index) => (
                                                <div key={index} className="text-sm text-text-secondary">
                                                    • {detail}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="p-6 flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                size="sm"
                            >
                                {cancelText}
                            </Button>
                            <Button
                                variant={type === 'danger' ? 'danger' : 'primary'}
                                onClick={handleConfirm}
                                size="sm"
                            >
                                {confirmText}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
