export type { ActionButtonConfig } from '../../../types';

export type RenameableItemLocalizedProps = {
  renameNameLabel: string;
};

export type RenameableItemEditingActionHandler = (action: string, data?: string) => Promise<void>;
