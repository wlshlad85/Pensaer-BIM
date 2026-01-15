/**
 * Pensaer BIM Platform - Keyboard Shortcuts Hook
 *
 * Global keyboard shortcut handling for the BIM editor.
 */

import { useEffect, useCallback } from 'react';
import { useUIStore, useSelectionStore, useModelStore, useHistoryStore } from '../stores';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const setTool = useUIStore((s) => s.setTool);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const zoomIn = useUIStore((s) => s.zoomIn);
  const zoomOut = useUIStore((s) => s.zoomOut);
  const zoomToFit = useUIStore((s) => s.zoomToFit);

  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const selectedIds = useSelectionStore((s) => s.selectedIds);

  const elements = useModelStore((s) => s.elements);
  const deleteElements = useModelStore((s) => s.deleteElements);
  const selectAll = useSelectionStore((s) => s.selectAll);

  const addToast = useUIStore((s) => s.addToast);

  // History (undo/redo)
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);

  // Define shortcuts
  const shortcuts: ShortcutConfig[] = [
    // Tools
    { key: 'v', action: () => setTool('select'), description: 'Select tool' },
    { key: 'w', action: () => setTool('wall'), description: 'Wall tool' },
    { key: 'd', action: () => setTool('door'), description: 'Door tool' },
    { key: 'n', action: () => setTool('window'), description: 'Window tool' },
    { key: 'm', action: () => setTool('room'), description: 'Room tool' },
    { key: 'f', action: () => setTool('floor'), description: 'Floor tool' },
    { key: 'r', action: () => setTool('roof'), description: 'Roof tool' },

    // Views
    { key: '2', action: () => setViewMode('2d'), description: '2D view' },
    { key: '3', action: () => setViewMode('3d'), description: '3D view' },

    // Zoom
    { key: '=', ctrl: true, action: zoomIn, description: 'Zoom in' },
    { key: '-', ctrl: true, action: zoomOut, description: 'Zoom out' },
    { key: '0', ctrl: true, action: zoomToFit, description: 'Zoom to fit' },

    // Command palette
    { key: 'k', ctrl: true, action: toggleCommandPalette, description: 'Command palette' },
    { key: 'k', meta: true, action: toggleCommandPalette, description: 'Command palette' },

    // Selection
    {
      key: 'a',
      ctrl: true,
      action: () => selectAll(elements.map((e) => e.id)),
      description: 'Select all',
    },
    {
      key: 'a',
      meta: true,
      action: () => selectAll(elements.map((e) => e.id)),
      description: 'Select all',
    },
    { key: 'Escape', action: clearSelection, description: 'Clear selection' },

    // Delete
    {
      key: 'Delete',
      action: () => {
        if (selectedIds.length > 0) {
          deleteElements(selectedIds);
          clearSelection();
          addToast('info', `Deleted ${selectedIds.length} element(s)`);
        }
      },
      description: 'Delete selected',
    },
    {
      key: 'Backspace',
      action: () => {
        if (selectedIds.length > 0) {
          deleteElements(selectedIds);
          clearSelection();
          addToast('info', `Deleted ${selectedIds.length} element(s)`);
        }
      },
      description: 'Delete selected',
    },

    // Undo/Redo
    {
      key: 'z',
      ctrl: true,
      action: () => {
        if (canUndo()) {
          undo();
          addToast('info', 'Undo');
        }
      },
      description: 'Undo',
    },
    {
      key: 'z',
      meta: true,
      action: () => {
        if (canUndo()) {
          undo();
          addToast('info', 'Undo');
        }
      },
      description: 'Undo',
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      action: () => {
        if (canRedo()) {
          redo();
          addToast('info', 'Redo');
        }
      },
      description: 'Redo',
    },
    {
      key: 'z',
      meta: true,
      shift: true,
      action: () => {
        if (canRedo()) {
          redo();
          addToast('info', 'Redo');
        }
      },
      description: 'Redo',
    },
    {
      key: 'y',
      ctrl: true,
      action: () => {
        if (canRedo()) {
          redo();
          addToast('info', 'Redo');
        }
      },
      description: 'Redo (Ctrl+Y)',
    },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        // Handle both ctrl and meta for cross-platform
        const modifierMatch =
          (shortcut.ctrl || shortcut.meta)
            ? (e.ctrlKey || e.metaKey)
            : (!e.ctrlKey && !e.metaKey);

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (shortcut.ctrl || shortcut.meta ? modifierMatch : ctrlMatch && metaMatch) &&
          shiftMatch &&
          altMatch
        ) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}
