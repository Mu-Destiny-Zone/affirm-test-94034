import { useEffect } from 'react';

export type ShortcutAction = () => void;

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: ShortcutAction;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchingShortcut = shortcuts.find((shortcut) => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const shiftMatches = !!shortcut.shift === event.shiftKey;
        const altMatches = !!shortcut.alt === event.altKey;

        return keyMatches && ctrlMatches && shiftMatches && altMatches;
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}

export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const keys: string[] = [];

  if (shortcut.ctrl) keys.push('Ctrl');
  if (shortcut.shift) keys.push('Shift');
  if (shortcut.alt) keys.push('Alt');
  if (shortcut.meta) keys.push('Cmd');

  keys.push(shortcut.key.toUpperCase());

  return keys.join(' + ');
}
