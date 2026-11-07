import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

import { POLYGON_EDITOR_CANVAS_HEIGHT, POLYGON_EDITOR_CANVAS_WIDTH } from './constants';
import { type PolygonEditorDialogProps, usePolygonEditorDialog } from './usePolygonEditorDialog';

const PolygonEditorDialog: FC<PolygonEditorDialogProps> = (props) => {
  const { t } = useTranslation();
  const { canSubmit, canvasRef, handleClose, handleDoubleClick, handlePointerDown, handlePointerMove, handlePointerUp, saving, submit } = usePolygonEditorDialog(props);

  return <Dialog disableEscapeKeyDown={saving} fullWidth maxWidth="md" onClose={handleClose} open={props.open}>
    <DialogTitle>{t('details.polygonEditorTitle')}</DialogTitle>
    <DialogContent sx={{ overflow: 'hidden' }}>
      <Typography mb={1} variant="body2">{t('details.polygonEditorInstructions')}</Typography>
      <canvas
        height={POLYGON_EDITOR_CANVAS_HEIGHT}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={canvasRef}
        style={{ background: '#222', maxWidth: '100%', touchAction: 'none', width: '100%' }}
        width={POLYGON_EDITOR_CANVAS_WIDTH}
      />
    </DialogContent>
    <DialogActions sx={{ pb: 3, px: 3 }}>
      <Button disabled={saving} onClick={props.onClose}>{t('common.cancel')}</Button>
      <Button disabled={saving || !canSubmit} onClick={submit} variant="contained">{t('common.apply')}</Button>
    </DialogActions>
  </Dialog>;
};

export default PolygonEditorDialog;
