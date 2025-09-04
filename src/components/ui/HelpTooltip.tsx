import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Keyboard } from 'lucide-react';

interface KeyboardShortcut {
    keys: string;
    description: string;
    category: string;
}

const keyboardShortcuts: KeyboardShortcut[] = [
    // Navigation
    { keys: 'Alt + 1', description: 'Market Overview', category: 'Navigation' },
    { keys: 'Alt + 2', description: 'Trading', category: 'Navigation' },
    { keys: 'Alt + 3', description: 'Positions', category: 'Navigation' },
    { keys: 'Alt + 4', description: 'History', category: 'Navigation' },
    { keys: 'Alt + 5', description: 'Analytics', category: 'Navigation' },

    // Modals & Actions
    { keys: 'Ctrl + P', description: 'Portfolio Overview', category: 'Portfolio' },
    { keys: 'Ctrl + D', description: 'Toggle Theme', category: 'Interface' },
    { keys: 'Ctrl + ?', description: 'Show Shortcuts', category: 'Help' },
    { keys: 'Escape', description: 'Close Modal/Dialog', category: 'Interface' },

    // Trading
    { keys: 'B', description: 'Buy Order (in trading)', category: 'Trading' },
    { keys: 'S', description: 'Sell Order (in trading)', category: 'Trading' },
    { keys: 'Enter', description: 'Execute Trade', category: 'Trading' },
];

const groupedShortcuts = keyboardShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
}, {} as Record<string, KeyboardShortcut[]>);

export const HelpTooltip: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                tooltipRef.current &&
                buttonRef.current &&
                !tooltipRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                title="Keyboard Shortcuts"
            >
                <HelpCircle className="w-5 h-5" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={tooltipRef}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-2 w-80 bg-background border border-border-primary rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                    >
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border-primary">
                                <Keyboard className="w-4 h-4 text-primary-500" />
                                <h3 className="font-semibold text-text-primary">Keyboard Shortcuts</h3>
                            </div>

                            <div className="space-y-4">
                                {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                                    <div key={category}>
                                        <h4 className="text-sm font-medium text-text-secondary mb-2">{category}</h4>
                                        <div className="space-y-2">
                                            {shortcuts.map((shortcut, index) => (
                                                <div key={index} className="flex items-center justify-between">
                                                    <span className="text-sm text-text-primary">{shortcut.description}</span>
                                                    <div className="flex items-center gap-1">
                                                        {shortcut.keys.split(' + ').map((key, keyIndex) => (
                                                            <React.Fragment key={keyIndex}>
                                                                {keyIndex > 0 && (
                                                                    <span className="text-xs text-text-secondary mx-1">+</span>
                                                                )}
                                                                <kbd className="px-2 py-1 text-xs font-mono bg-surface border border-border-primary rounded text-text-primary">
                                                                    {key}
                                                                </kbd>
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-3 border-t border-border-primary">
                                <p className="text-xs text-text-secondary text-center">
                                    Press <kbd className="px-1 py-0.5 text-xs font-mono bg-surface border border-border-primary rounded">Ctrl + ?</kbd> to toggle this help
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
