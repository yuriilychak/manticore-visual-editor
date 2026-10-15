import { Suspense } from 'react';

import type { ProjectActionHandler } from '../../../types';

import { MODAL_CONFIG } from './dialogs';
import type { ModalComponent, ModalPropsMap, ModalType } from './modal-types';

type AppModalProps = {
  modalData: ModalPropsMap;
  onAction: ProjectActionHandler;
  type: ModalType | '';
};

const AppModal = ({ modalData, onAction, type }: AppModalProps) => {
  if (!type) return null;

  const Modal = MODAL_CONFIG[type] as ModalComponent<typeof type>;

  return (
    <Suspense fallback={null}>
      <Modal {...modalData[type]} onAction={onAction} />
    </Suspense>
  );
};

export default AppModal;
