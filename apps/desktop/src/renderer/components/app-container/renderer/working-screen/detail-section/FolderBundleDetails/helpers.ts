import type { ProjectContent } from '@manticore/project/types';

import { getDescendantIds } from '../../../../helpers';
import { FILE_TYPE_SET, INITIAL_COUNTS } from './constants';

import type { FileCounts, FileType } from './types';

export const getFileCounts = (
  childrenIdsByParentId: Readonly<Record<number, readonly number[]>>,
  contentById: Readonly<Record<number, ProjectContent>>,
  id: number
) => {
  const descendantIds = getDescendantIds(childrenIdsByParentId, id);

  return descendantIds.reduce<FileCounts>((counts, descendantId) => {
    const type = contentById[descendantId]?.type as FileType;

    if (FILE_TYPE_SET.has(type)) {
      counts[type] += 1;
      counts.hasAnyContent = true;
    }
    
    return counts;
  }, { ...INITIAL_COUNTS });
};
