import { describe, expect, jest, test } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FolderConfig } from '../../../../../../../../types';
import { ProjectStructureContext } from '../../../../../ProjectStructureContext';

import ProjectSection from '../ProjectSection';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('ProjectSection', () => {
  const renderProjectSection = (
    onAction: (action: string, contentType: string, id: number, data?: unknown) => Promise<void>,
    folders: FolderConfig[] = []
  ) =>
    render(
      <ProjectStructureContext.Provider
        value={{ bundles: new Map(), folders, name: 'Initial project', onAction, path: '/tmp/project' }}
      >
        <ProjectSection />
      </ProjectStructureContext.Provider>
    );

  test('renames the project with a trimmed name', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, contentType: string, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction);

    await user.click(screen.getByRole('button', { name: 'common.rename' }));
    const input = screen.getByRole('textbox', { name: 'common.renameName' });
    await user.clear(input);
    await user.type(input, '  Renamed project  ');
    await user.click(screen.getByRole('button', { name: 'common.saveRename' }));

    expect(onAction).toHaveBeenCalledWith('rename', 'project', 0, 'Renamed project');
    expect(screen.getByRole('heading', { name: 'Initial project' })).toBeInTheDocument();
  });

  test('does not allow an empty trimmed project name to be submitted', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, contentType: string, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction);

    await user.click(screen.getByRole('button', { name: 'common.rename' }));
    const input = screen.getByRole('textbox', { name: 'common.renameName' });
    await user.clear(input);
    await user.type(input, '   ');

    expect(screen.getByRole('button', { name: 'common.saveRename' })).toBeDisabled();
    expect(onAction).not.toHaveBeenCalled();
  });

  test('renders nested folders in an expandable tree without the unnamed root folder', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, contentType: string, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction, [
      { id: 0, items: ['00000'], name: '' },
      { id: 1, items: [], name: 'Assets/Images' }
    ]);

    const assetsAccordion = screen.getByRole('button', { name: 'Assets folder' });

    expect(within(assetsAccordion).getByTestId('FolderIcon')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Images' })).not.toBeInTheDocument();

    await user.click(assetsAccordion);

    expect(within(assetsAccordion).getByTestId('FolderOpenIcon')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Images' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading')).toHaveLength(3);
  });

  test('dispatches the add-folder action', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, contentType: string, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction);

    await user.click(screen.getByRole('button', { name: 'folder.add' }));

    expect(onAction).toHaveBeenCalledWith('add-folder', 'project', 0);
  });

  test('dispatches the full parent path when adding a nested folder', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, contentType: string, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction, [{ id: 1, items: [], name: 'Assets/Images' }]);

    await user.click(screen.getByRole('button', { name: 'Assets folder' }));
    await user.click(screen.getAllByRole('button', { name: 'folder.add' })[1]);

    expect(onAction).toHaveBeenCalledWith('add-folder', 'project-folder', 1, 'Assets/Images');
  });

  test('renames a folder using its ID', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, contentType: string, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction, [{ id: 1, items: [], name: 'Assets' }]);

    await user.click(screen.getAllByRole('button', { name: 'common.rename' })[1]);
    const input = screen.getByRole('textbox', { name: 'common.renameName' });
    await user.clear(input);
    await user.type(input, 'Resources');
    await user.click(screen.getByRole('button', { name: 'common.saveRename' }));

    expect(onAction).toHaveBeenCalledWith('rename', 'project-folder', 1, 'Resources');
  });
});
