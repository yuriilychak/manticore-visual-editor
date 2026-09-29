import { useCallback, useState } from 'react';

import type { AssetType, ProjectActionHandler } from '../../../../../../../types';

export const useRenameableItem = (
  contentType: AssetType,
  id: number,
  onAction: ProjectActionHandler
) => {
  const [isEditing, setEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);

  const handleButtonClick = useCallback(
    async (action: string, data: string = '') => {
      switch (action) {
        case 'cancel':
          setEditing(false);
          break;
        case 'rename':
          setEditing(true);
          break;
        case 'save':
          if (!data) return;

          setSaving(true);
          try {
            await onAction('rename', contentType, id, data);
            setEditing(false);
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
    [contentType, id, onAction]
  );

  return { handleButtonClick, isEditing, isSaving };
};
