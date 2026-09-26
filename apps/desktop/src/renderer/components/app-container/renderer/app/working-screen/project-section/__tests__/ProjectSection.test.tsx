import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ProjectContent } from '@manticore/project/types';
import { AssetType, type FolderConfig, type ProjectActionHandler } from '../../../../../../../../types';
import { ProjectStructureContext } from '../../../../../ProjectStructureContext';

import ProjectSection from '../ProjectSection';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('ProjectSection', () => {
  const renderProjectSection = (
    onAction: ProjectActionHandler,
    folders: FolderConfig[] = [],
    content: ProjectContent[] = []
  ) =>
    render(
      <ProjectStructureContext.Provider
        value={{ onAction, project: { content, folders, name: 'Initial project', path: '/tmp/project' } }}
      >
        <ProjectSection />
      </ProjectStructureContext.Provider>
    );

  test('renames the project with a trimmed name', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction);

    await user.click(screen.getByRole('button', { name: 'common.rename' }));
    const input = screen.getByRole('textbox', { name: 'common.renameName' });
    await user.clear(input);
    await user.type(input, '  Renamed project  ');
    await user.click(screen.getByRole('button', { name: 'common.saveRename' }));

    expect(onAction).toHaveBeenCalledWith('rename', AssetType.Project, 0, 'Renamed project');
    expect(screen.getByRole('heading', { name: 'Initial project' })).toBeInTheDocument();
  });

  test('does not allow an empty trimmed project name to be submitted', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
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
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
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

  test('resets a folder icon when it no longer has children', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();
    const { rerender } = renderProjectSection(onAction, [
      { id: 1, items: [], name: 'Assets' },
      { id: 2, items: [], name: 'Assets/Images' }
    ]);
    const assetsAccordion = screen.getByRole('button', { name: 'Assets folder' });

    await user.click(assetsAccordion);
    expect(within(assetsAccordion).getByTestId('FolderOpenIcon')).toBeInTheDocument();

    rerender(
      <ProjectStructureContext.Provider
        value={{
          onAction,
          project: {
            content: [],
            folders: [{ id: 1, items: [], name: 'Assets' }],
            name: 'Initial project',
            path: '/tmp/project'
          }
        }}
      >
        <ProjectSection />
      </ProjectStructureContext.Provider>
    );

    expect(screen.getByTestId('FolderIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('FolderOpenIcon')).not.toBeInTheDocument();
  });

  test('renders root folder bundles with their configured names', () => {
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(
      onAction,
      [
        { id: 0, items: ['00015', 'missing'], name: '' },
        { id: 1, items: [], name: 'Assets' }
      ],
      [{ data: null, id: 15, name: 'Main bundle', parentId: 0, type: 2, version: 1 }]
    );

    expect(screen.getByRole('heading', { name: 'Main bundle' })).toBeInTheDocument();
    expect(screen.getByTestId('BundleIcon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'bundleFolder.add' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'textureAtlas.add' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'missing' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Initial project',
      'Assets',
      'Main bundle'
    ]);
  });

  test('renames a bundle using its ID', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(
      onAction,
      [{ id: 1, items: ['2'], name: '' }],
      [{ data: null, id: 2, name: 'default_bundle', parentId: 1, type: 2, version: 0 }]
    );

    await user.click(screen.getAllByRole('button', { name: 'common.rename' })[1]);
    const input = screen.getByRole('textbox', { name: 'common.renameName' });
    await user.clear(input);
    await user.type(input, 'Main bundle');
    await user.click(screen.getByRole('button', { name: 'common.saveRename' }));

    expect(onAction).toHaveBeenCalledWith('rename', AssetType.Bundle, 2, 'Main bundle');
  });

  test('renders bundle folders and texture atlases beneath an expandable bundle', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(
      onAction,
      [{ id: 1, items: ['2'], name: '' }],
      [
        { data: null, id: 2, name: 'default_bundle', parentId: 1, type: AssetType.Bundle, version: 0 },
        { data: null, id: 3, name: 'Sprites', parentId: 2, type: AssetType.BundleFolder, version: 0 },
        { data: null, id: 4, name: 'Characters', parentId: 2, type: AssetType.TextureAtlas, version: 0 }
      ]
    );

    await user.click(screen.getByRole('button', { name: 'default_bundle bundle' }));

    expect(screen.getByRole('heading', { name: 'Sprites' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Characters' })).toBeInTheDocument();
    expect(screen.getByTestId('AtlasIcon')).toBeInTheDocument();
  });

  test('dispatches the add-folder action', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction);

    await user.click(screen.getByRole('button', { name: 'folder.add' }));

    expect(onAction).toHaveBeenCalledWith('add-folder', AssetType.Project, 0);
  });

  test('dispatches the add-bundle action from the project', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction);

    await user.click(screen.getByRole('button', { name: 'bundle.add' }));

    expect(onAction).toHaveBeenCalledWith('add-bundle', AssetType.Project, 0);
  });

  test('dispatches the import action from the project root', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction);

    await user.click(screen.getByRole('button', { name: 'common.import' }));

    expect(onAction).toHaveBeenCalledWith('import', AssetType.Project, 0);
  });

  test('dispatches the import action from a bundle', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(
      onAction,
      [{ id: 1, items: ['2'], name: '' }],
      [{ data: null, id: 2, name: 'default_bundle', parentId: 1, type: AssetType.Bundle, version: 0 }]
    );

    await user.click(screen.getAllByRole('button', { name: 'common.import' })[1]);

    expect(onAction).toHaveBeenCalledWith('import', AssetType.Bundle, 2);
  });

  test('dispatches the full parent path when adding a nested folder', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction, [{ id: 1, items: [], name: 'Assets/Images' }]);

    await user.click(screen.getByRole('button', { name: 'Assets folder' }));
    await user.click(screen.getAllByRole('button', { name: 'folder.add' })[1]);

    expect(onAction).toHaveBeenCalledWith('add-folder', AssetType.ProjectFolder, 1, 'Assets/Images');
  });

  test('dispatches the full parent path when adding a bundle to a folder', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction, [{ id: 1, items: [], name: 'Assets/Images' }]);

    await user.click(screen.getByRole('button', { name: 'Assets folder' }));
    await user.click(screen.getAllByRole('button', { name: 'bundle.add' })[1]);

    expect(onAction).toHaveBeenCalledWith('add-bundle', AssetType.ProjectFolder, 1, 'Assets/Images');
  });

  test('moves a folder only when it is dropped on another project folder', () => {
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();
    const dragData = new Map<string, string>();
    const dataTransfer = {
      dropEffect: '',
      effectAllowed: '',
      getData: (type: string) => dragData.get(type) ?? '',
      setData: (type: string, value: string) => dragData.set(type, value),
      types: ['application/x-manticore-project-folder']
    };

    renderProjectSection(onAction, [
      { id: 1, items: [], name: 'Assets' },
      { id: 2, items: [], name: 'Resources' }
    ]);

    const source = screen.getByRole('heading', { name: 'Assets' }).closest('[draggable="true"]');
    const target = screen.getByRole('heading', { name: 'Resources' }).closest('[draggable="true"]');

    expect(source).not.toBeNull();
    expect(target).not.toBeNull();

    fireEvent.dragStart(source as HTMLElement, { dataTransfer });
    fireEvent.dragOver(target as HTMLElement, { dataTransfer });
    fireEvent.drop(target as HTMLElement, { dataTransfer });

    expect(onAction).toHaveBeenCalledWith('move', AssetType.ProjectFolder, 1, 'Resources');
  });

  test('moves a folder to the root when it is dropped on the project item', () => {
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();
    const dragData = new Map<string, string>();
    const dataTransfer = {
      dropEffect: '',
      effectAllowed: '',
      getData: (type: string) => dragData.get(type) ?? '',
      setData: (type: string, value: string) => dragData.set(type, value),
      types: ['application/x-manticore-project-folder']
    };

    renderProjectSection(onAction, [{ id: 1, items: [], name: 'Assets' }]);

    const source = screen.getByRole('heading', { name: 'Assets' }).closest('[draggable="true"]');
    const projectItem = screen.getByRole('heading', { name: 'Initial project' }).parentElement?.parentElement;

    expect(source).not.toBeNull();
    expect(projectItem).not.toBeNull();

    fireEvent.dragStart(source as HTMLElement, { dataTransfer });
    fireEvent.dragOver(projectItem as HTMLElement, { dataTransfer });
    fireEvent.drop(projectItem as HTMLElement, { dataTransfer });

    expect(onAction).toHaveBeenCalledWith('move', AssetType.ProjectFolder, 1, '');
  });

  test('moves a bundle into a project folder and back to the root', () => {
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();
    const dragData = new Map<string, string>();
    const dataTransfer = {
      dropEffect: '',
      effectAllowed: '',
      getData: (type: string) => dragData.get(type) ?? '',
      setData: (type: string, value: string) => dragData.set(type, value),
      types: ['application/x-manticore-project-bundle']
    };

    renderProjectSection(
      onAction,
      [{ id: 1, items: ['2'], name: '' }, { id: 3, items: [], name: 'Assets' }],
      [{ data: null, id: 2, name: 'default_bundle', parentId: 1, type: 2, version: 0 }]
    );

    const bundle = screen.getByRole('heading', { name: 'default_bundle' }).closest('[draggable="true"]');
    const target = screen.getByRole('heading', { name: 'Assets' }).closest('[draggable="true"]');
    const projectItem = screen.getByRole('heading', { name: 'Initial project' }).parentElement?.parentElement;

    expect(bundle).not.toBeNull();
    expect(target).not.toBeNull();
    expect(projectItem).not.toBeNull();

    fireEvent.dragStart(bundle as HTMLElement, { dataTransfer });
    fireEvent.dragOver(target as HTMLElement, { dataTransfer });
    fireEvent.drop(target as HTMLElement, { dataTransfer });
    fireEvent.dragOver(projectItem as HTMLElement, { dataTransfer });
    fireEvent.drop(projectItem as HTMLElement, { dataTransfer });

    expect(onAction).toHaveBeenCalledWith('move', AssetType.Bundle, 2, 'Assets');
    expect(onAction).toHaveBeenCalledWith('move', AssetType.Bundle, 2, '');
  });

  test('indents bundles and makes a folder containing them expandable', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(
      onAction,
      [{ id: 1, items: [], name: '' }, { id: 3, items: ['2'], name: 'Assets' }],
      [{ data: null, id: 2, name: 'default_bundle', parentId: 3, type: 2, version: 0 }]
    );

    const assetsAccordion = screen.getByRole('button', { name: 'Assets folder' });
    expect(screen.queryByRole('heading', { name: 'default_bundle' })).not.toBeInTheDocument();

    await user.click(assetsAccordion);

    expect(screen.getByRole('heading', { name: 'default_bundle' }).parentElement?.parentElement?.parentElement).toHaveStyle({ paddingLeft: '8px' });
  });

  test('renames a folder using its ID', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction, [{ id: 1, items: [], name: 'Assets' }]);

    await user.click(screen.getAllByRole('button', { name: 'common.rename' })[1]);
    const input = screen.getByRole('textbox', { name: 'common.renameName' });
    await user.clear(input);
    await user.type(input, 'Resources');
    await user.click(screen.getByRole('button', { name: 'common.saveRename' }));

    expect(onAction).toHaveBeenCalledWith('rename', AssetType.ProjectFolder, 1, 'Resources');
  });
});
