import type { SvgIconComponent } from '@mui/icons-material';

import type { ApplicationAction } from '../../../../types';

export type WelcomeAction = {
  action: ApplicationAction;
  Icon: SvgIconComponent;
  labelKey: string;
};
