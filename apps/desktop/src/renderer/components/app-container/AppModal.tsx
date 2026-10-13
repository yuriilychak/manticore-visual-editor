import type { ProjectActionHandler } from '../../../types';

import { MODAL_CONFIG } from './dialogs';
import type { ModalComponent, ModalPropsMap, ModalType } from './modal-types';

type AppModalProps = {
  modalData: ModalPropsMap;
  onAction: ProjectActionHandler;
  type: ModalType;
};

const AppModal = ({ modalData, onAction, type }: AppModalProps) => {
  const Modal = MODAL_CONFIG[type] as ModalComponent<typeof type>;

  return <Modal {...modalData[type]} onAction={onAction} />;
};

export default AppModal;
