import { describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import WelcomeScreen from '../WelcomeScreen';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'welcome.community': 'Community',
        'welcome.documentation': 'Documentation',
        'welcome.newProject': 'New Project...',
        'welcome.openProject': 'Open Project...',
        'welcome.start': 'Start',
        'welcome.title': 'Welcome to Manticore'
      };

      return translations[key] ?? key;
    }
  })
}));

describe('WelcomeScreen', () => {
  test('renders localized content and propagates welcome-screen actions', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();

    render(<WelcomeScreen onAction={onAction} />);

    screen.getByRole('heading', { name: 'Welcome to Manticore' });
    screen.getByRole('heading', { name: 'Start' });
    screen.getByRole('button', { name: 'New Project...' });
    screen.getByRole('button', { name: 'Open Project...' });
    screen.getByRole('button', { name: 'Documentation' });
    screen.getByRole('button', { name: 'Community' });

    await user.click(screen.getByRole('button', { name: 'New Project...' }));

    expect(onAction).toHaveBeenCalledWith('create-project');
  });
});
