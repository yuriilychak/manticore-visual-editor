import { useCallback, useState } from 'react';

import type { AssetType, ProjectActionHandler } from '../../../../../../types';

export const useRenameableItem = (
  contentType: AssetType,
  id: number,
  onAction: ProjectActionHandler,
  onEditingChange: (id: number) => void
) => {
  const [isSaving, setSaving] = useState(false);

  const handleButtonClick = useCallback(
    async (action: string, data: string = '') => {
      switch (action) {
        case 'cancel':
          onEditingChange(-1);
          break;
        case 'save':
          if (!data) return;

          setSaving(true);
          try {
            await onAction('rename', contentType, id, data);
            onEditingChange(-1);
          } catch {
            // The caller is responsible for presenting a failed-save notification.
          } finally {
            setSaving(false);
          }
          break;
        default:
          await onAction(action, contentType, id);
      }
    },
    [contentType, id, onAction, onEditingChange]
  );

  return { handleButtonClick, isSaving };
};
