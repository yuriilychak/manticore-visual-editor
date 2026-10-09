import { AssetType } from '../types';

export type ShortcutLabels = Record<'darwin' | 'linux' | 'win32', string>;

type ShortcutModifier = 'none' | 'primary';

export const KEYBOARD_SHORTCUTS = {
  'add-folder': {
    action: 'add-folder',
    allowedContentTypes: [
      AssetType.Project,
      AssetType.ProjectFolder,
      AssetType.Bundle,
      AssetType.BundleFolder
    ],
    labels: {
      darwin: '⌘+N',
      linux: 'Ctrl+N',
      win32: 'Ctrl+N'
    },
    modifier: 'primary' as ShortcutModifier
  },
  delete: {
    action: 'open-delete-modal',
    allowedContentTypes: [
      AssetType.ProjectFolder,
      AssetType.Bundle,
      AssetType.BundleFolder,
      AssetType.Font,
      AssetType.Image,
      AssetType.TextureAtlas
    ],
    labels: {
      darwin: 'Delete',
      linux: 'Delete',
      win32: 'Delete'
    },
    modifier: 'none' as ShortcutModifier
  }
};

export type KeyboardShortcutId = keyof typeof KEYBOARD_SHORTCUTS;

export const ADD_FOLDER_SHORTCUT = KEYBOARD_SHORTCUTS['add-folder'].labels;
export const DELETE_SHORTCUT = KEYBOARD_SHORTCUTS.delete.labels;

type KeyboardShortcutListener = (shortcutId: KeyboardShortcutId) => void;

class KeyboardShortcuts {
  private readonly listeners = new Set<KeyboardShortcutListener>();

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable="true"]')) return;

    const shortcutId = (Object.keys(KEYBOARD_SHORTCUTS) as KeyboardShortcutId[])
      .find((id) => this.isPressed(event, id));
    if (!shortcutId) return;

    event.preventDefault();
    this.listeners.forEach(listener => listener(shortcutId));
  };

  subscribe(listener: KeyboardShortcutListener) {
    this.listeners.add(listener);
    if (this.listeners.size === 1) window.addEventListener('keydown', this.handleKeyDown);

    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) window.removeEventListener('keydown', this.handleKeyDown);
    };
  }

  isPressed(event: KeyboardEvent, shortcutId: KeyboardShortcutId) {
    const platform = (window.manticore?.platform ?? 'linux') as keyof ShortcutLabels;
    const shortcut = KEYBOARD_SHORTCUTS[shortcutId];
    const key = shortcut.labels[platform].split('+').at(-1);
    const isModifierPressed = shortcut.modifier === 'primary'
      ? platform === 'darwin' ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
      : !event.metaKey && !event.ctrlKey;
    if (!key) return false;

    return event.key.toLocaleLowerCase() === key.toLocaleLowerCase() && !event.altKey && !event.shiftKey && isModifierPressed;
  }

  getAction(shortcutId: KeyboardShortcutId, contentType: AssetType) {
    const shortcut = KEYBOARD_SHORTCUTS[shortcutId];

    return shortcut.allowedContentTypes.includes(contentType) ? shortcut.action : undefined;
  }
}

export const keyboardShortcuts = new KeyboardShortcuts();
