import type { SvgIconComponent } from '@mui/icons-material';

import type { ApplicationAction } from '../../../../../types';

export type WelcomeScreenLocalizedProps = {
  helpTitle: string;
  learnTitle: string;
  startTitle: string;
  subtitle: string;
  title: string;
};

export type WelcomeAction = {
  action: ApplicationAction;
  Icon: SvgIconComponent;
  labelKey: string;
};
