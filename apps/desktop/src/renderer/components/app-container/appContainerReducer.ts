import { AssetType } from '../../../types';

import type { ProjectInfo, RestoredProject } from '../../types';

import type { MenubarItemId } from './app-shell/title-bar/menubar';
import type { ImportAssetResult } from './common';
import { NotificationError } from './constants';
import type { DeleteContentDialogData } from './delete-content-dialog';
import type { ImportAssetsDialogData } from './import-assets-dialog';
import type { NewContentDialogData } from './new-content-dialog';
import { ProjectProxy } from './ProjectProxy';
import { CONTENT_STRATEGY_CONSTRUCTORS, type ContentStrategy, type OpenNewContentData } from './strategies';

const DEFAULT_DELETE_CONTENT: DeleteContentDialogData = {
  assetType: AssetType.Project,
  id: 0,
  isOpen: false,
  name: '',
  type: 'delete-content'
};

const DEFAULT_IMPORT_ASSETS_DIALOG: ImportAssetsDialogData = {
  bundleId: 0,
  bundles: [],
  errors: [],
  isOpen: false,
  type: 'import-asset'
};

export type AppContainerState = {
  bundles: ImportAssetsDialogData['bundles'];
  contentStrategies: ReadonlyMap<AssetType, ContentStrategy>;
  defaultNewContentDialog: NewContentDialogData;
  deleteContent: DeleteContentDialogData;
  disabledItemIds: readonly MenubarItemId[];
  importAssetsDialog: ImportAssetsDialogData;
  newContentDialog: NewContentDialogData;
  notificationError: NotificationError;
  project: ProjectInfo | null;
  projectProxy: ProjectProxy;
  selection: readonly number[];
};

export type AppContainerAction = { type: string; payload?: unknown };

export const createInitialAppContainerState = (): AppContainerState => {
  const projectProxy = new ProjectProxy();
  const contentStrategies = CONTENT_STRATEGY_CONSTRUCTORS.reduce<Map<AssetType, ContentStrategy>>(
    (strategies, [assetType, Strategy]) => strategies.set(assetType, new Strategy(projectProxy)),
    new Map()
  );
  const defaultNewContentDialog: NewContentDialogData = {
    isOpen: false,
    strategy: contentStrategies.get(AssetType.ProjectFolder)!,
    type: 'new-content'
  };

  return {
    bundles: [],
    contentStrategies,
    defaultNewContentDialog,
    deleteContent: DEFAULT_DELETE_CONTENT,
    disabledItemIds: [],
    importAssetsDialog: DEFAULT_IMPORT_ASSETS_DIALOG,
    newContentDialog: defaultNewContentDialog,
    notificationError: NotificationError.None,
    project: null,
    projectProxy,
    selection: []
  };
};

type ReducerActionHandler = (prevState: AppContainerState, payload?: unknown) => AppContainerState;

const reducerAction = <Payload>(
  handler: (prevState: AppContainerState, payload: Payload) => AppContainerState
): ReducerActionHandler => (prevState, payload) => handler(prevState, payload as Payload);

const projectChanged = (state: AppContainerState, project: ProjectInfo): AppContainerState => {
  state.projectProxy.setProject(project);

  return {
    ...state,
    bundles: project.content?.filter((content) => content.type === AssetType.Bundle) ?? [],
    project,
    selection: state.project?.path === project.path ? state.selection : []
  };
};

const REDUCER_ACTIONS = new Map<AppContainerAction['type'], ReducerActionHandler>([
  ['create-project', (state) => ({
    ...state,
    newContentDialog: {
      isOpen: true,
      strategy: state.contentStrategies.get(AssetType.Project)!,
      type: 'new-content'
    }
  })],
  ['delete-content-completed', reducerAction<NotificationError | undefined>((state, error) => ({
    ...state,
    deleteContent: DEFAULT_DELETE_CONTENT,
    notificationError: error ?? state.notificationError
  }))],
  ['delete-content-opened', reducerAction<Pick<DeleteContentDialogData, 'assetType' | 'id'>>((state, data) => {
    const content = state.project?.content?.find((item) => item.id === data.id && item.type === data.assetType);
    if (!content || data.assetType === AssetType.Project) return state;

    return {
      ...state,
      deleteContent: { ...data, isOpen: true, name: content.name, type: 'delete-content' }
    };
  })],
  ['delete-content-closed', (state) => ({ ...state, deleteContent: DEFAULT_DELETE_CONTENT })],
  ['import-assets-dialog-opened', reducerAction<number | null>((state, bundleId) => {
    const selectedBundle = state.bundles.find((bundle) => bundle.id === bundleId) ?? state.bundles[0];
    if (!selectedBundle) return { ...state, notificationError: NotificationError.ContentTypeUnavailable };

    return {
      ...state,
      importAssetsDialog: {
        bundleId: selectedBundle.id,
        bundles: state.bundles,
        errors: [],
        isOpen: true,
        type: 'import-asset'
      }
    };
  })],
  ['import-assets-dialog-closed', (state) => ({ ...state, importAssetsDialog: DEFAULT_IMPORT_ASSETS_DIALOG })],
  ['import-assets-completed', reducerAction<ImportAssetResult[]>((state, errors) => ({
    ...state,
    importAssetsDialog: errors.length
      ? { ...state.importAssetsDialog, errors }
      : DEFAULT_IMPORT_ASSETS_DIALOG
  }))],
  ['new-content-dialog-opened', reducerAction<OpenNewContentData>((state, data) => {
    const strategy = state.contentStrategies.get(data.assetType);
    if (!strategy) return { ...state, notificationError: NotificationError.ContentTypeUnavailable };

    try {
      strategy.setFields(data.fields);
      return { ...state, newContentDialog: { isOpen: true, strategy, type: 'new-content' } };
    } catch {
      return { ...state, notificationError: NotificationError.ContentConfiguration };
    }
  })],
  ['new-content-dialog-closed', (state) => {
    state.newContentDialog.strategy.setField('parentPath', '');
    return { ...state, newContentDialog: state.defaultNewContentDialog };
  }],
  ['notification-error-set', reducerAction<NotificationError>((state, notificationError) => ({
    ...state,
    notificationError
  }))],
  ['project-changed', reducerAction<ProjectInfo>(projectChanged)],
  ['restore-project-completed', reducerAction<RestoredProject>((state, { error, project }) => {
    if (project) return projectChanged(state, project);
    return error ? { ...state, notificationError: NotificationError.RestoreProject } : state;
  })],
  ['selection-changed', reducerAction<{ id: number; isExtended: boolean }>((state, { id, isExtended }) => {
    const selection = isExtended
      ? state.selection.includes(id)
        ? state.selection.filter((item) => item !== id)
        : state.selection.concat(id)
      : [id];

    return { ...state, selection };
  })]
]);

export const appContainerReducer = (state: AppContainerState, action: AppContainerAction): AppContainerState =>
  REDUCER_ACTIONS.has(action.type) ? REDUCER_ACTIONS.get(action.type)!(state, action.payload) : state;
