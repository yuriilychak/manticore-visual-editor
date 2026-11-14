import type { ProjectContent } from '@manticore/project/types';

import { AssetType } from '../../../../../../types';

export const getSelectedImageIds = (
  childrenIdsByParentId: Readonly<Record<number, readonly number[]>>,
  contentById: Readonly<Record<number, ProjectContent>>,
  selection: readonly number[]
) => {
  if (selection.length < 2) return [];

  const selectedIds = new Set(selection);
  const getDescendantIds = (id: number): number[] => (childrenIdsByParentId[id] ?? []).flatMap((childId) => [childId, ...getDescendantIds(childId)]);
  const isImageOnlySelection = selection.every((id) => {
    const item = contentById[id];
    if (!item) return false;
    if (item.type === AssetType.Image) return true;
    const descendantIds = getDescendantIds(id);
    return descendantIds.length > 0
      && descendantIds.every((descendantId) => selectedIds.has(descendantId))
      && descendantIds.filter((descendantId) => !(childrenIdsByParentId[descendantId]?.length)).every((descendantId) => contentById[descendantId]?.type === AssetType.Image);
  });

  return isImageOnlySelection ? selection.filter((id) => contentById[id]?.type === AssetType.Image) : [];
};
