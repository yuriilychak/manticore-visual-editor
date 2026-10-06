import type { SvgIconComponent } from '@mui/icons-material';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderIcon from '@mui/icons-material/Folder';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import ImageIcon from '@mui/icons-material/Image';
import WorkIcon from '@mui/icons-material/Work';
import type { SxProps, Theme } from '@mui/material/styles';

import { AssetType } from '../../../../../../../types';
import { AtlasAddIcon, AtlasIcon, BundleAddIcon, BundleIcon, ImportIcon } from '../../../../../custom-icons';

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
  expandable?: boolean;
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

export const DISABLED_ACTIONS: Record<string, boolean> = {};

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
    expandable: true,
    icon: FolderIcon
  },
  [AssetType.Bundle]: {
    actions: BUNDLE_CONTENT_ACTIONS,
    dragType: PROJECT_BUNDLE_DRAG_TYPE,
    dropTargets: BUNDLE_CONTENT_DROP_TARGETS,
    expandable: true,
    icon: BundleIcon
  },
  [AssetType.BundleFolder]: {
    actions: BUNDLE_FOLDER_CONTENT_ACTIONS,
    dragType: BUNDLE_FOLDER_DRAG_TYPE,
    dropTargets: BUNDLE_CONTENT_DROP_TARGETS,
    expandable: true,
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
    expandable: true,
    icon: AtlasIcon
  }
};

export const PROJECT_ITEM_STYLES: Record<'root', SxProps<Theme>> = {
  root: {
    borderRadius: 1,
    minHeight: 24,
    px: 0.5,
    transition: theme => theme.transitions.create('background-color'),
    '&:hover': { bgcolor: 'action.hover' },
    '&[aria-selected="true"], &[aria-selected="true"]:hover': { bgcolor: 'action.selected' }
  }
};
