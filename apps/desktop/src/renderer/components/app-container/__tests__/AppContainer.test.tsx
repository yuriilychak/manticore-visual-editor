import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

import AppContainer from '../AppContainer';

jest.mock('react-i18next', () => {
  const mockChangeLanguage = jest.fn();

  return {
    mockChangeLanguage,
    useTranslation: () => ({ i18n: { changeLanguage: mockChangeLanguage, language: 'en' }, t: (key: string) => key })
  };
});
jest.mock('../app-shell', () => ({
  AppShell: ({ children, disabledItemIds }: { children: ReactNode; disabledItemIds: readonly string[] }) => (
    <div data-disabled-item-ids={disabledItemIds.join(',')}>{children}</div>
  )
}));
jest.mock('../renderer', () => ({
  Renderer: ({ onAction }: { onAction: (action: 'create-project' | 'create-window' | 'set-language-es') => void }) => (
    <>
      <button onClick={() => onAction('set-language-es')}>Renderer content</button>
      <button onClick={() => onAction('create-window')}>New window</button>
      <button onClick={() => onAction('create-project')}>New project</button>
    </>
  )
}));

const mockReactI18next = jest.requireMock('react-i18next') as { mockChangeLanguage: jest.Mock };

describe('AppContainer', () => {
  afterEach(() => {
    delete window.manticore;
  });

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

  test('creates a window using the current language', async () => {
    const createWindow = jest.fn<(language: string) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    window.manticore = {
      createProject: jest.fn<(options: { name: string; parentPath: string }) => Promise<void>>().mockResolvedValue(undefined),
      createWindow,
      platform: 'linux',
      selectProjectLocation: jest.fn<() => Promise<string | undefined>>().mockResolvedValue(undefined),
      windowControls: {} as never
    };

    render(<AppContainer />);

    await user.click(screen.getByRole('button', { name: 'New window' }));

    expect(createWindow).toHaveBeenCalledWith('en');
  });
});
