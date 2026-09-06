import { describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

import AppContainer from '../AppContainer';

jest.mock('react-i18next', () => {
  const mockChangeLanguage = jest.fn();

  return {
    mockChangeLanguage,
    useTranslation: () => ({ i18n: { changeLanguage: mockChangeLanguage, language: 'en' } })
  };
});
jest.mock('../app-shell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));
jest.mock('../renderer', () => ({
  Renderer: ({ onAction }: { onAction: (action: 'set-language-es') => void }) => (
    <button onClick={() => onAction('set-language-es')}>Renderer content</button>
  )
}));

const mockReactI18next = jest.requireMock('react-i18next') as { mockChangeLanguage: jest.Mock };

describe('AppContainer', () => {
  test('renders the renderer inside the application shell', () => {
    render(<AppContainer />);

    screen.getByText('Renderer content');
  });

  test('changes language for a language action', async () => {
    const user = userEvent.setup();
    mockReactI18next.mockChangeLanguage.mockClear();

    render(<AppContainer />);

    await user.click(screen.getByRole('button', { name: 'Renderer content' }));

    expect(mockReactI18next.mockChangeLanguage).toHaveBeenCalledWith('es');
  });
});
