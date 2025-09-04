import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    action: () => void;
    description: string;
}

interface UseKeyboardShortcutsProps {
    shortcuts: KeyboardShortcut[];
    enabled?: boolean;
}

export const useKeyboardShortcuts = ({ shortcuts, enabled = true }: UseKeyboardShortcutsProps) => {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        // Don't trigger shortcuts when typing in inputs
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        const matchingShortcut = shortcuts.find(shortcut => {
            return (
                event.key.toLowerCase() === shortcut.key.toLowerCase() &&
                !!event.ctrlKey === !!shortcut.ctrlKey &&
                !!event.shiftKey === !!shortcut.shiftKey &&
                !!event.altKey === !!shortcut.altKey
            );
        });

        if (matchingShortcut) {
            event.preventDefault();
            matchingShortcut.action();
        }
    }, [shortcuts, enabled]);

    useEffect(() => {
        if (!enabled) return;

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown, enabled]);

    return shortcuts;
};

// Pre-defined shortcut sets
export const createNavigationShortcuts = (
    setViewMode: (mode: string) => void
): KeyboardShortcut[] => [
        {
            key: '1',
            altKey: true,
            action: () => setViewMode('overview'),
            description: 'Switch to Overview tab'
        },
        {
            key: '2',
            altKey: true,
            action: () => setViewMode('trading'),
            description: 'Switch to Trading tab'
        },
        {
            key: '3',
            altKey: true,
            action: () => setViewMode('positions'),
            description: 'Switch to Positions tab'
        },
        {
            key: '4',
            altKey: true,
            action: () => setViewMode('history'),
            description: 'Switch to History tab'
        },
        {
            key: '5',
            altKey: true,
            action: () => setViewMode('analytics'),
            description: 'Switch to Analytics tab'
        }
    ];

export const createModalShortcuts = (
    togglePortfolioModal: () => void,
    toggleTheme: () => void,
    toggleKeyboardHelp: () => void
): KeyboardShortcut[] => [
        {
            key: 'p',
            ctrlKey: true,
            action: togglePortfolioModal,
            description: 'Open Portfolio modal'
        },
        {
            key: 'd',
            ctrlKey: true,
            action: toggleTheme,
            description: 'Toggle Dark/Light mode'
        },
        {
            key: '?',
            ctrlKey: true,
            action: toggleKeyboardHelp,
            description: 'Show keyboard shortcuts'
        },
        {
            key: 'Escape',
            action: () => {
                // This will be handled by individual modals
            },
            description: 'Close modal'
        }
    ];
