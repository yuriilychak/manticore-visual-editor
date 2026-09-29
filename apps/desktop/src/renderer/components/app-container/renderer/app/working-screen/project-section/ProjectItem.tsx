import { type DragEvent, type FC, type ReactNode } from 'react';

import type { SvgIconComponent } from '@mui/icons-material';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import ImageIcon from '@mui/icons-material/Image';
import WorkIcon from '@mui/icons-material/Work';
import { Box } from '@mui/material';

import { AssetType, type ProjectActionHandler } from '../../../../../../../types';
import { AtlasAddIcon, AtlasIcon, AtlasOpenIcon, BundleAddIcon, BundleIcon, BundleOpenIcon, ImportIcon } from '../../../../../custom-icons';

import { RenameableItem } from '../renameable-item';
import type { ActionButtonConfig } from '../renameable-item/types';

import {
  BUNDLE_FOLDER_DRAG_TYPE,
  IMAGE_DRAG_TYPE,
  PROJECT_BUNDLE_DRAG_TYPE,
  PROJECT_FOLDER_DRAG_TYPE,
  TEXTURE_ATLAS_DRAG_TYPE
} from './helpers';

type ProjectItemConfig = {
  actions?: ActionButtonConfig[];
  dragType?: string;
  dropTargets?: Record<string, AssetType>;
  expandedIcon?: SvgIconComponent;
  icon: SvgIconComponent;
};

const ADD_CONTENT_ACTIONS: ActionButtonConfig[] = [
  { action: 'add-folder', tooltipLocale: 'folder.add', Icon: CreateNewFolderIcon },
  { action: 'add-bundle', tooltipLocale: 'bundle.add', Icon: BundleAddIcon }
];

const ROOT_CONTENT_ACTIONS: ActionButtonConfig[] = [
  ...ADD_CONTENT_ACTIONS,
  { action: 'import', tooltipLocale: 'common.import', Icon: ImportIcon }
];

const BUNDLE_CONTENT_ACTIONS: ActionButtonConfig[] = [
  { action: 'add-folder', tooltipLocale: 'bundleFolder.add', Icon: CreateNewFolderIcon },
  { action: 'add-atlas', tooltipLocale: 'textureAtlas.add', Icon: AtlasAddIcon },
  { action: 'import', tooltipLocale: 'common.import', Icon: ImportIcon }
];

const BUNDLE_FOLDER_CONTENT_ACTIONS: ActionButtonConfig[] = [
  { action: 'add-folder', tooltipLocale: 'bundleFolder.add', Icon: CreateNewFolderIcon },
  { action: 'add-atlas', tooltipLocale: 'textureAtlas.add', Icon: AtlasAddIcon }
];

const FOLDER_AND_BUNDLE_DROP_TARGETS = {
  [PROJECT_FOLDER_DRAG_TYPE]: AssetType.ProjectFolder,
  [PROJECT_BUNDLE_DRAG_TYPE]: AssetType.Bundle
};

const BUNDLE_CONTENT_DROP_TARGETS = {
  [BUNDLE_FOLDER_DRAG_TYPE]: AssetType.BundleFolder,
  [IMAGE_DRAG_TYPE]: AssetType.Image,
  [PROJECT_BUNDLE_DRAG_TYPE]: AssetType.Bundle,
  [TEXTURE_ATLAS_DRAG_TYPE]: AssetType.TextureAtlas
};

const ATLAS_DROP_TARGETS = {
  [IMAGE_DRAG_TYPE]: AssetType.Image
};

export const PROJECT_ITEM_CONFIG: Record<AssetType, ProjectItemConfig> = {
  [AssetType.Project]: {
    actions: ROOT_CONTENT_ACTIONS,
    dropTargets: FOLDER_AND_BUNDLE_DROP_TARGETS,
    icon: WorkIcon
  },
  [AssetType.ProjectFolder]: {
    actions: ADD_CONTENT_ACTIONS,
    dragType: PROJECT_FOLDER_DRAG_TYPE,
    dropTargets: FOLDER_AND_BUNDLE_DROP_TARGETS,
    expandedIcon: FolderOpenIcon,
    icon: FolderIcon
  },
  [AssetType.Bundle]: {
    actions: BUNDLE_CONTENT_ACTIONS,
    dragType: PROJECT_BUNDLE_DRAG_TYPE,
    dropTargets: BUNDLE_CONTENT_DROP_TARGETS,
    expandedIcon: BundleOpenIcon,
    icon: BundleIcon
  },
  [AssetType.BundleFolder]: {
    actions: BUNDLE_FOLDER_CONTENT_ACTIONS,
    dragType: BUNDLE_FOLDER_DRAG_TYPE,
    dropTargets: BUNDLE_CONTENT_DROP_TARGETS,
    expandedIcon: FolderOpenIcon,
    icon: FolderIcon
  },
  [AssetType.Font]: {
    icon: FontDownloadIcon
  },
  [AssetType.Image]: {
    dragType: IMAGE_DRAG_TYPE,
    icon: ImageIcon
  },
  [AssetType.TextureAtlas]: {
    dragType: TEXTURE_ATLAS_DRAG_TYPE,
    dropTargets: ATLAS_DROP_TARGETS,
    expandedIcon: AtlasOpenIcon,
    icon: AtlasIcon
  }
};

export const getProjectItemIcon = (contentType: AssetType, expanded = false) => {
  const { expandedIcon, icon } = PROJECT_ITEM_CONFIG[contentType];

  return expanded && expandedIcon ? expandedIcon : icon;
};

export type ProjectItemProps = {
  children?: ReactNode;
  contentType: AssetType;
  expanded?: boolean;
  id: number;
  name: string;
  onAction: ProjectActionHandler;
  dropTargetId?: number;
};

const ProjectItem: FC<ProjectItemProps> = ({ contentType, dropTargetId, expanded = false, id, name, onAction }) => {
  const config = PROJECT_ITEM_CONFIG[contentType];
  const resolvedDropTargetId = dropTargetId ?? id;
  const Icon = getProjectItemIcon(contentType, expanded);
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (!config.dragType || (event.target instanceof Element && event.target.closest('button, input'))) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(config.dragType, String(id));
  };
  const getDropTarget = (event: DragEvent<HTMLDivElement>) =>
    Object.entries(config.dropTargets ?? {}).find(([dragType]) => Array.from(event.dataTransfer.types).includes(dragType));
  const getDraggedItem = (event: DragEvent<HTMLDivElement>) => {
    const dropTarget = getDropTarget(event);
    if (!dropTarget) return;

    const [dragType, draggedContentType] = dropTarget;
    const draggedId = Number(event.dataTransfer.getData(dragType));
    if (!Number.isInteger(draggedId) || draggedId < 0 || (draggedContentType === contentType && draggedId === id)) return;

    return { draggedContentType, draggedId };
  };
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!getDropTarget(event)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const draggedItem = getDraggedItem(event);
    if (!draggedItem) return;

    event.preventDefault();
    void Promise.resolve(onAction('move', draggedItem.draggedContentType, draggedItem.draggedId, resolvedDropTargetId)).catch(() => undefined);
  };

  return (
    <Box
      draggable={Boolean(config.dragType)}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      width="100%"
    >
      <RenameableItem
        actions={config.actions}
        contentType={contentType}
        Icon={Icon}
        id={id}
        name={name}
        onAction={onAction}
      />
    </Box>
  );
};

export default ProjectItem;
