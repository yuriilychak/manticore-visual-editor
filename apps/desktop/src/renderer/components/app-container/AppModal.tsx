import { Suspense } from 'react';

import type { ProjectActionHandler } from '../../../types';

import { MODAL_CONFIG } from './dialogs';
import type { ModalComponent, ModalPropsMap, ModalType } from './modal-types';

type AppModalProps = {
  modalData: ModalPropsMap;
  onAction: ProjectActionHandler;
  projectPath: string;
  type: ModalType | '';
};

const AppModal = ({ modalData, onAction, projectPath, type }: AppModalProps) => {
  if (!type) return null;

  const Modal = MODAL_CONFIG[type] as ModalComponent<typeof type>;

  return (
    <Suspense fallback={null}>
      <Modal {...modalData[type]} onAction={onAction} projectPath={projectPath} />
    </Suspense>
  );
};

export default AppModal;
