import type { SvgIconComponent } from '@mui/icons-material';
import AddRounded from '@mui/icons-material/AddRounded';
import BugReportOutlined from '@mui/icons-material/BugReportOutlined';
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import KeyboardRounded from '@mui/icons-material/KeyboardRounded';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';
import RocketLaunchOutlined from '@mui/icons-material/RocketLaunchOutlined';

type WelcomeAction = {
  Icon: SvgIconComponent;
  labelKey: string;
};

export const START_ACTIONS: readonly WelcomeAction[] = [
  { Icon: AddRounded, labelKey: 'welcome.newProject' },
  { Icon: FolderOpenRounded, labelKey: 'welcome.openProject' }
];

export const LEARN_ACTIONS: readonly WelcomeAction[] = [
  { Icon: RocketLaunchOutlined, labelKey: 'welcome.gettingStarted' },
  { Icon: MenuBookRounded, labelKey: 'welcome.documentation' },
  { Icon: KeyboardRounded, labelKey: 'welcome.keyboardShortcuts' }
];

export const HELP_ACTIONS: readonly WelcomeAction[] = [
  { Icon: HelpOutlineRounded, labelKey: 'welcome.helpCenter' },
  { Icon: GroupsOutlined, labelKey: 'welcome.community' },
  { Icon: BugReportOutlined, labelKey: 'welcome.reportIssue' }
];
