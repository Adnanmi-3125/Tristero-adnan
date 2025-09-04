import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Command } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

const shortcutGroups = [
    {
        title: 'Navigation',
        shortcuts: [
            { keys: ['Alt', '1'], description: 'Switch to Overview' },
            { keys: ['Alt', '2'], description: 'Switch to Trading' },
            { keys: ['Alt', '3'], description: 'Switch to Positions' },
            { keys: ['Alt', '4'], description: 'Switch to History' },
            { keys: ['Alt', '5'], description: 'Switch to Analytics' },
        ]
    },
    {
        title: 'Actions',
        shortcuts: [
            { keys: ['Ctrl', 'P'], description: 'Open Portfolio modal' },
            { keys: ['Ctrl', 'D'], description: 'Toggle Dark/Light mode' },
            { keys: ['Ctrl', '?'], description: 'Show keyboard shortcuts' },
            { keys: ['Esc'], description: 'Close modal' },
        ]
    }
];

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
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
                        className="w-full max-w-lg bg-surface border border-border-primary rounded-xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-border-primary">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                                        <Keyboard className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-text-primary">Keyboard Shortcuts</h2>
                                        <p className="text-sm text-text-secondary">Navigate faster with these shortcuts</p>
                                    </div>
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
                        <div className="p-6 max-h-96 overflow-y-auto">
                            <div className="space-y-6">
                                {shortcutGroups.map((group, groupIndex) => (
                                    <div key={group.title}>
                                        <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                                            <Command className="w-4 h-4 text-primary-500" />
                                            {group.title}
                                        </h3>
                                        <div className="space-y-3">
                                            {group.shortcuts.map((shortcut, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: groupIndex * 0.1 + index * 0.05 }}
                                                    className="flex items-center justify-between py-2"
                                                >
                                                    <span className="text-text-primary">{shortcut.description}</span>
                                                    <div className="flex items-center gap-1">
                                                        {shortcut.keys.map((key, keyIndex) => (
                                                            <React.Fragment key={keyIndex}>
                                                                <kbd className="px-2 py-1 bg-surface-hover border border-border-primary rounded text-xs font-mono text-text-primary">
                                                                    {key}
                                                                </kbd>
                                                                {keyIndex < shortcut.keys.length - 1 && (
                                                                    <span className="text-text-secondary text-xs">+</span>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-border-primary bg-surface/50">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-text-secondary">
                                    Press <kbd className="px-1 py-0.5 bg-surface-hover border border-border-primary rounded text-xs">Esc</kbd> to close
                                </p>
                                <Button onClick={onClose} size="sm">
                                    Got it
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
