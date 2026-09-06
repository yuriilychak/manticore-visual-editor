import AddRounded from '@mui/icons-material/AddRounded';
import BugReportOutlined from '@mui/icons-material/BugReportOutlined';
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import KeyboardRounded from '@mui/icons-material/KeyboardRounded';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';
import RocketLaunchOutlined from '@mui/icons-material/RocketLaunchOutlined';

import type { WelcomeAction } from './types';

export const START_ACTIONS: readonly WelcomeAction[] = [
  { action: 'create-project', Icon: AddRounded, labelKey: 'welcome.newProject' },
  { action: 'open-project', Icon: FolderOpenRounded, labelKey: 'welcome.openProject' }
];

export const LEARN_ACTIONS: readonly WelcomeAction[] = [
  { action: 'getting-started', Icon: RocketLaunchOutlined, labelKey: 'welcome.gettingStarted' },
  { action: 'open-documentation', Icon: MenuBookRounded, labelKey: 'welcome.documentation' },
  { action: 'open-keyboard-shortcuts', Icon: KeyboardRounded, labelKey: 'welcome.keyboardShortcuts' }
];

export const HELP_ACTIONS: readonly WelcomeAction[] = [
  { action: 'open-help-center', Icon: HelpOutlineRounded, labelKey: 'welcome.helpCenter' },
  { action: 'open-community', Icon: GroupsOutlined, labelKey: 'welcome.community' },
  { action: 'report-issue', Icon: BugReportOutlined, labelKey: 'welcome.reportIssue' }
];
