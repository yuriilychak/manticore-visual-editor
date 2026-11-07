import { type FC, memo, type MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Button } from '@mui/material';

type ImageActionsProps = {
  applying: boolean;
  canApplyPolygonSettings: boolean;
  canModifyPolygons: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

const ImageActions: FC<ImageActionsProps> = ({ applying, canApplyPolygonSettings, canModifyPolygons, onClick }) => {
  const { t } = useTranslation();

  return (
    <Box display="flex" gap={1} px={1}>
      {canModifyPolygons && <Button disabled={applying} id="modify" loading={applying} onClick={onClick} size="small" variant="outlined">{t('common.modify')}</Button>}
      <Button disabled={!canApplyPolygonSettings} id="apply" loading={applying} onClick={onClick} size="small" variant="contained">
        {t('common.apply')}
      </Button>
    </Box>
  );
};

export default memo(ImageActions);
