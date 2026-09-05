import { describe, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import App from '../App';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { platform: string }) => {
      const translations: Record<string, string> = {
        'app.description': 'The desktop shell, React UI, and development hot reload are ready.',
        'app.productName': 'Manticore 2.0',
        'app.title': 'Visual Editor'
      };

      return key === 'app.platform' ? `Running on ${values?.platform}.` : translations[key];
    }
  })
}));

describe('App', () => {
  test('renders the localized application content', () => {
    render(<App />);

    screen.getByRole('heading', { name: 'Visual Editor' });
    screen.getByText('Manticore 2.0');
    screen.getByText('Running on the web preview.');
  });
});
