import type { ModalComponent, ModalType } from '../modal-types';

import { DeleteContentDialog } from './delete-content-dialog';
import { ImportAssetsDialog } from './import-assets-dialog';
import { NewContentDialog } from './new-content-dialog';

export const MODAL_CONFIG: { [Type in ModalType]: ModalComponent<Type> } = {
  'delete-content': DeleteContentDialog,
  'import-asset': ImportAssetsDialog,
  'new-content': NewContentDialog
};
