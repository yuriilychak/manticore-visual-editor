import { lazy } from 'react';

import type { ModalComponent, ModalType } from '../modal-types';

import { DeleteContentDialog } from './delete-content-dialog';
import { NewContentDialog } from './new-content-dialog';

const ImportAssetsDialog = lazy(() => import('./import-assets-dialog/ImportAssetsDialog'));

export const MODAL_CONFIG: { [Type in ModalType]: ModalComponent<Type> } = {
  'delete-content': DeleteContentDialog,
  'import-asset': ImportAssetsDialog,
  'new-content': NewContentDialog
};
