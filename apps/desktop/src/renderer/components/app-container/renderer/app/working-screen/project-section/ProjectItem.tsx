import { type DragEvent, type FC } from 'react';

import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import WorkIcon from '@mui/icons-material/Work';
import type { SvgIconComponent } from '@mui/icons-material';
import { Box } from '@mui/material';

import { AssetType, type ProjectActionHandler } from '../../../../../../../types';
import { AtlasAddIcon, AtlasIcon, AtlasOpenIcon, BundleAddIcon, BundleIcon, BundleOpenIcon } from '../../../../../custom-icons';

import { RenameableItem } from '../renameable-item';
import type { ActionButtonConfig } from '../renameable-item/types';

import { PROJECT_BUNDLE_DRAG_TYPE, PROJECT_FOLDER_DRAG_TYPE } from './helpers';

export type ProjectItemType = AssetType.Project | AssetType.ProjectFolder | AssetType.Bundle | AssetType.BundleFolder | AssetType.TextureAtlas;

type ProjectItemConfig = {
  actions?: ActionButtonConfig[];
  dragType?: string;
  dropTargets?: Record<string, AssetType>;
  expandedIcon?: SvgIconComponent;
  icon: SvgIconComponent;
  passesParentPathToCreateActions?: boolean;
};

const ADD_CONTENT_ACTIONS: ActionButtonConfig[] = [
  { action: 'add-folder', tooltipLocale: 'folder.add', Icon: CreateNewFolderIcon },
  { action: 'add-bundle', tooltipLocale: 'bundle.add', Icon: BundleAddIcon }
];

const BUNDLE_CONTENT_ACTIONS: ActionButtonConfig[] = [
  { action: 'add-folder', tooltipLocale: 'bundleFolder.add', Icon: CreateNewFolderIcon },
  { action: 'add-atlas', tooltipLocale: 'textureAtlas.add', Icon: AtlasAddIcon }
];

const FOLDER_AND_BUNDLE_DROP_TARGETS = {
  [PROJECT_FOLDER_DRAG_TYPE]: AssetType.ProjectFolder,
  [PROJECT_BUNDLE_DRAG_TYPE]: AssetType.Bundle
};

export const PROJECT_ITEM_CONFIG: Record<ProjectItemType, ProjectItemConfig> = {
  [AssetType.Project]: {
    actions: ADD_CONTENT_ACTIONS,
    dropTargets: FOLDER_AND_BUNDLE_DROP_TARGETS,
    icon: WorkIcon
  },
  [AssetType.ProjectFolder]: {
    actions: ADD_CONTENT_ACTIONS,
    dragType: PROJECT_FOLDER_DRAG_TYPE,
    dropTargets: FOLDER_AND_BUNDLE_DROP_TARGETS,
    expandedIcon: FolderOpenIcon,
    icon: FolderIcon,
    passesParentPathToCreateActions: true
  },
  [AssetType.Bundle]: {
    actions: BUNDLE_CONTENT_ACTIONS,
    dragType: PROJECT_BUNDLE_DRAG_TYPE,
    expandedIcon: BundleOpenIcon,
    icon: BundleIcon
  },
  [AssetType.BundleFolder]: {
    actions: BUNDLE_CONTENT_ACTIONS,
    expandedIcon: FolderOpenIcon,
    icon: FolderIcon
  },
  [AssetType.TextureAtlas]: {
    expandedIcon: AtlasOpenIcon,
    icon: AtlasIcon
  }
};

export const getProjectItemIcon = (contentType: ProjectItemType, expanded = false) => {
  const { expandedIcon, icon } = PROJECT_ITEM_CONFIG[contentType];

  return expanded && expandedIcon ? expandedIcon : icon;
};

type ProjectItemProps = {
  contentType: ProjectItemType;
  expanded?: boolean;
  id: number;
  name: string;
  onAction: ProjectActionHandler;
  parentPath?: string;
};

const ProjectItem: FC<ProjectItemProps> = ({ contentType, expanded = false, id, name, onAction, parentPath }) => {
  const config = PROJECT_ITEM_CONFIG[contentType];
  const Icon = getProjectItemIcon(contentType, expanded);
  const handleAction: ProjectActionHandler = (action, actionContentType, actionId, data) => {
    if (config.passesParentPathToCreateActions && (action === 'add-folder' || action === 'add-bundle')) {
      return onAction(action, actionContentType, actionId, parentPath);
    }

    return data === undefined ? onAction(action, actionContentType, actionId) : onAction(action, actionContentType, actionId, data);
  };
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
    void Promise.resolve(onAction('move', draggedItem.draggedContentType, draggedItem.draggedId, parentPath ?? '')).catch(() => undefined);
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
        onAction={handleAction}
      />
    </Box>
  );
};

export default ProjectItem;
