import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

import type { NewProjectOptions, ProjectCreationValidation, RestoredProject } from '../../../types';

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
  Renderer: ({
    onAction,
    projectPath
  }: {
    onAction: (action: 'create-project' | 'create-window' | 'set-language-es') => void;
    projectPath: string;
  }) => (
    <>
      <div data-project-path={projectPath} data-testid="renderer" />
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
    window.history.replaceState({}, '', '/');
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
      canCreateProject: jest
        .fn<(options: NewProjectOptions) => Promise<ProjectCreationValidation>>()
        .mockResolvedValue({ isAvailable: true }),
      createProject: jest.fn<(options: { name: string; parentPath: string }) => Promise<string>>().mockResolvedValue('/tmp/project'),
      createWindow,
      openProject: jest.fn<() => Promise<{ name: string; path: string }>>().mockResolvedValue({ name: '', path: '' }),
      platform: 'linux',
      restoreLastOpenedProject: jest.fn<() => Promise<RestoredProject>>().mockResolvedValue({ project: null }),
      selectProjectLocation: jest.fn<() => Promise<string>>().mockResolvedValue(''),
      windowControls: {} as never
    };

    render(<AppContainer />);

    await user.click(screen.getByRole('button', { name: 'New window' }));

    expect(createWindow).toHaveBeenCalledWith('en');
  });

  test('restores the previous project only for a restoration startup window', async () => {
    window.history.replaceState({}, '', '/?restoreProject=true');
    window.manticore = {
      canCreateProject: jest
        .fn<(options: NewProjectOptions) => Promise<ProjectCreationValidation>>()
        .mockResolvedValue({ isAvailable: true }),
      createProject: jest.fn<(options: NewProjectOptions) => Promise<string>>().mockResolvedValue('/tmp/project'),
      createWindow: jest.fn<(language: string) => Promise<void>>().mockResolvedValue(undefined),
      openProject: jest.fn<() => Promise<{ name: string; path: string }>>().mockResolvedValue({ name: '', path: '' }),
      platform: 'linux',
      restoreLastOpenedProject: jest
        .fn<() => Promise<RestoredProject>>()
        .mockResolvedValue({ project: { name: 'Restored project', path: '/tmp/restored-project' } }),
      selectProjectLocation: jest.fn<() => Promise<string>>().mockResolvedValue(''),
      windowControls: {} as never
    };

    render(<AppContainer />);

    await waitFor(() => expect(screen.getByTestId('renderer')).toHaveAttribute('data-project-path', '/tmp/restored-project'));
  });
});
