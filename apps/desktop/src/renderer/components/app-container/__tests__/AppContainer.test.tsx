import { afterEach, describe, expect, jest, test } from '@jest/globals';
import type { ProjectContent } from '@manticore/project/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MouseEvent, ReactNode } from 'react';

import { AssetType } from '../../../../types';
import type { NewProjectOptions, ProjectCreationValidation, ProjectInfo, RestoredProject } from '../../../types';

import AppContainer from '../AppContainer';
import { ApplicationActionContext as mockApplicationActionContext } from '../ApplicationActionContext';
import { ProjectStructureContext } from '../ProjectStructureContext';

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
  Renderer: () => (
    <mockApplicationActionContext.Consumer>
      {(onAction) => {
        const handleAction = (event: MouseEvent<HTMLButtonElement>) => {
          onAction?.(event.currentTarget.dataset.action as 'create-project' | 'create-window' | 'set-language-es');
        };

        return <>
        <ProjectStructureContext.Consumer>
          {(projectStructure) => (
            <>
              <div
                data-bundle-count={projectStructure?.project?.content?.length}
                data-project-path={projectStructure?.project?.path}
                data-testid="renderer"
              />
              <button onClick={() => void projectStructure?.onAction('add-folder', AssetType.Project, 0)}>Add folder</button>
              <button onClick={() => void projectStructure?.onAction('add-bundle', AssetType.Project, 0)}>Add bundle</button>
              <button onClick={() => void projectStructure?.onAction('add-folder', AssetType.ProjectFolder, 1, 'Assets')}>
                Add nested folder
              </button>
              <button onClick={() => void projectStructure?.onAction('add-bundle', AssetType.ProjectFolder, 1, 'Assets')}>
                Add nested bundle
              </button>
            </>
          )}
        </ProjectStructureContext.Consumer>
        <button data-action="set-language-es" onClick={handleAction}>
          Renderer content
        </button>
        <button data-action="create-window" onClick={handleAction}>
          New window
        </button>
        <button data-action="create-project" onClick={handleAction}>
          New project
        </button>
        </>;
      }}
    </mockApplicationActionContext.Consumer>
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
      createProjectFolder:
        jest.fn<(projectPath: string, parentId: number, name: string) => Promise<ProjectContent>>(),
      createProjectBundle: jest.fn<(projectPath: string, parentId: number, name: string) => Promise<ProjectContent>>(),
      createProject: jest
        .fn<(options: { name: string; parentPath: string }) => Promise<ProjectInfo>>()
        .mockResolvedValue({ content: [], name: 'Project', path: '/tmp/project' }),
      createWindow,
      openProject: jest
        .fn<() => Promise<ProjectInfo>>()
        .mockResolvedValue({ content: [], name: '', path: '' }),
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
      createProjectFolder:
        jest.fn<(projectPath: string, parentId: number, name: string) => Promise<ProjectContent>>(),
      createProjectBundle: jest.fn<(projectPath: string, parentId: number, name: string) => Promise<ProjectContent>>(),
      createProject: jest
        .fn<(options: NewProjectOptions) => Promise<ProjectInfo>>()
        .mockResolvedValue({ content: [], name: 'Project', path: '/tmp/project' }),
      createWindow: jest.fn<(language: string) => Promise<void>>().mockResolvedValue(undefined),
      openProject: jest
        .fn<() => Promise<ProjectInfo>>()
        .mockResolvedValue({ content: [], name: '', path: '' }),
      platform: 'linux',
      restoreLastOpenedProject: jest.fn<() => Promise<RestoredProject>>().mockResolvedValue({
        project: {
          content: [
            { data: null, id: 1, name: 'Bundles', parentId: 0, type: AssetType.ProjectFolder, version: 0 },
            { data: null, id: 2, name: 'default_bundle', parentId: 1, type: AssetType.Bundle, version: 0 }
          ],
          name: 'Restored project',
          path: '/tmp/restored-project'
        }
      }),
      selectProjectLocation: jest.fn<() => Promise<string>>().mockResolvedValue(''),
      windowControls: {} as never
    };

    render(<AppContainer />);

    await waitFor(() =>
      expect(screen.getByTestId('renderer')).toHaveAttribute('data-project-path', '/tmp/restored-project')
    );
    expect(screen.getByTestId('renderer')).toHaveAttribute('data-bundle-count', '1');
  });

  test('creates a project folder and updates the project structure', async () => {
    const createProjectFolder = jest
      .fn<(projectPath: string, parentId: number, name: string) => Promise<ProjectContent>>()
      .mockResolvedValueOnce({ data: null, id: 1, name: 'Assets', parentId: 0, type: AssetType.ProjectFolder, version: 0 })
      .mockResolvedValueOnce({ data: null, id: 2, name: 'Images', parentId: 1, type: AssetType.ProjectFolder, version: 0 });
    const createProjectBundle = jest
      .fn<(projectPath: string, parentId: number, name: string) => Promise<ProjectContent>>()
      .mockResolvedValueOnce({ data: null, id: 3, name: 'Root bundle', parentId: 0, type: AssetType.Bundle, version: 0 })
      .mockResolvedValueOnce({ data: null, id: 4, name: 'Asset bundle', parentId: 1, type: AssetType.Bundle, version: 0 });
    const user = userEvent.setup();
    window.manticore = {
      canCreateProject: jest
        .fn<(options: NewProjectOptions) => Promise<ProjectCreationValidation>>()
        .mockResolvedValue({ isAvailable: true }),
      createProjectFolder,
      createProjectBundle,
      createProject: jest
        .fn<(options: NewProjectOptions) => Promise<ProjectInfo>>()
        .mockResolvedValue({ content: [], name: 'Project', path: '/tmp/project' }),
      createWindow: jest.fn<(language: string) => Promise<void>>().mockResolvedValue(undefined),
      openProject: jest
        .fn<() => Promise<ProjectInfo>>()
        .mockResolvedValue({ content: [], name: 'Project', path: '/tmp/project' }),
      platform: 'linux',
      renameProject: jest.fn<(projectPath: string, name: string) => Promise<string>>(),
      restoreLastOpenedProject: jest
        .fn<() => Promise<RestoredProject>>()
        .mockResolvedValue({
          project: {
            content: [{ data: null, id: 0, name: '', parentId: 0, type: AssetType.ProjectFolder, version: 0 }],
            name: 'Project',
            path: '/tmp/project'
          }
        }),
      selectProjectLocation: jest.fn<() => Promise<string>>().mockResolvedValue(''),
      windowControls: {} as never
    };
    window.history.replaceState({}, '', '/?restoreProject=true');

    render(<AppContainer />);

    await waitFor(() => expect(screen.getByTestId('renderer')).toHaveAttribute('data-project-path', '/tmp/project'));
    await user.click(screen.getByRole('button', { name: 'Add folder' }));
    await user.type(screen.getByRole('textbox', { name: 'folder.name' }), 'Assets');
    await user.click(screen.getByRole('button', { name: 'folder.create' }));

    expect(createProjectFolder).toHaveBeenCalledWith('/tmp/project', 0, 'Assets');
    await waitFor(() => expect(screen.getByTestId('renderer')).toHaveAttribute('data-bundle-count', '2'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add nested folder' }));
    await user.type(screen.getByRole('textbox', { name: 'folder.name' }), 'Images');
    await user.click(screen.getByRole('button', { name: 'folder.create' }));

    expect(createProjectFolder).toHaveBeenCalledWith('/tmp/project', 1, 'Images');
    await waitFor(() => expect(screen.getByTestId('renderer')).toHaveAttribute('data-bundle-count', '3'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add bundle' }));
    await user.type(screen.getByRole('textbox', { name: 'bundle.name' }), 'Root bundle');
    await user.click(screen.getByRole('button', { name: 'bundle.create' }));

    expect(createProjectBundle).toHaveBeenCalledWith('/tmp/project', 0, 'Root bundle');
    await waitFor(() => expect(screen.getByTestId('renderer')).toHaveAttribute('data-bundle-count', '4'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add nested bundle' }));
    await user.type(screen.getByRole('textbox', { name: 'bundle.name' }), 'Asset bundle');
    await user.click(screen.getByRole('button', { name: 'bundle.create' }));

    expect(createProjectBundle).toHaveBeenCalledWith('/tmp/project', 1, 'Asset bundle');
    await waitFor(() => expect(screen.getByTestId('renderer')).toHaveAttribute('data-bundle-count', '5'));
  });
});
