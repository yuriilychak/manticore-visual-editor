import type { ProjectActionHandler } from '../../../types';

import { DeleteContentDialog } from './delete-content-dialog';
import { ImportAssetsDialog } from './import-assets-dialog';
import type { ModalComponent, ModalPropsMap, ModalType } from './modal-types';
import { NewContentDialog } from './new-content-dialog';

type AppModalProps = {
  modalData: ModalPropsMap;
  onAction: ProjectActionHandler;
  type: ModalType;
};

const MODAL_CONFIG: { [Type in ModalType]: ModalComponent<Type> } = {
  'delete-content': DeleteContentDialog,
  'import-asset': ImportAssetsDialog,
  'new-content': NewContentDialog
};

const AppModal = ({ modalData, onAction, type }: AppModalProps) => {
  const Modal = MODAL_CONFIG[type] as ModalComponent<typeof type>;

  return <Modal {...modalData[type]} onAction={onAction} />;
};

export default AppModal;
