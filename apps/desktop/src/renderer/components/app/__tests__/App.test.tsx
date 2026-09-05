import { describe, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import App from '../App';

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

describe('App', () => {
  test('renders the localized application content', () => {
    render(<App />);

    screen.getByRole('heading', { name: 'Welcome to Manticore' });
    screen.getByRole('heading', { name: 'Start' });
    screen.getByRole('button', { name: 'New Project...' });
    screen.getByRole('button', { name: 'Open Project...' });
    screen.getByRole('button', { name: 'Documentation' });
    screen.getByRole('button', { name: 'Community' });
  });
});
