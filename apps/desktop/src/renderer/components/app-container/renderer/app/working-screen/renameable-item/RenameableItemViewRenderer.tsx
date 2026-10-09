import type { FC } from 'react';

import { Typography } from '@mui/material';

import { RENAMEABLE_ITEM_STYLES } from './constants';

type RenameableItemViewRendererProps = {
  name: string;
};

const RenameableItemViewRenderer: FC<RenameableItemViewRendererProps> = ({
  name
}) => (
  <Typography component="h2" noWrap sx={RENAMEABLE_ITEM_STYLES.name} title={name} variant="subtitle1">
    {name}
  </Typography>
);

export default RenameableItemViewRenderer;
