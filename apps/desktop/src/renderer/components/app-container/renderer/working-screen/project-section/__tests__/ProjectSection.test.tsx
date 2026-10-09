import { describe, expect, jest, test } from '@jest/globals';
import type { ProjectContent } from '@manticore/project/types';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { AssetType, type ProjectActionHandler } from '../../../../../../../types';
import { ProjectStructureContext } from '../../../../ProjectStructureContext';

import ProjectSection from '../ProjectSection';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('ProjectSection', () => {
  type FolderFixture = { id: number; items: string[]; name: string };

  const getProjectContent = (folders: FolderFixture[], content: ProjectContent[]) => {
    const folderByPath = new Map<string, ProjectContent>();
    let virtualFolderId = -1;

    for (const folder of [...folders].sort((left, right) => left.name.split('/').length - right.name.split('/').length)) {
      let parentId = 0;
      let path = '';
      const segments = folder.name.split('/').filter(Boolean);

      if (!segments.length) {
        folderByPath.set('', { data: null, id: folder.id, name: '', parentId: 0, type: AssetType.ProjectFolder, version: 0 });
        continue;
      }

      for (const [index, name] of segments.entries()) {
        path = path ? `${path}/${name}` : name;
        let item = folderByPath.get(path);
        if (!item) {
          item = {
            data: null,
            id: index === segments.length - 1 ? folder.id : virtualFolderId--,
            name,
            parentId,
            type: AssetType.ProjectFolder,
            version: 0
          };
          folderByPath.set(path, item);
        }
        parentId = item.id;
      }
    }

    return Array.from(folderByPath.values()).concat(content);
  };

  const renderProjectSection = (
    onAction: ProjectActionHandler,
    folders: FolderFixture[] = [],
    content: ProjectContent[] = [],
    selectedItems: readonly number[] = []
  ) => {
    const ProjectSectionWithContext = () => {
      const [expandedItemIds, setExpandedItemIds] = useState<readonly number[]>([]);

      return (
      <ProjectStructureContext.Provider
        value={{
          expandedItemIds,
          onAction,
          project: { content: getProjectContent(folders, content), name: 'Initial project', path: '/tmp/project' },
          selectedItems,
          setExpandedItemIds
        }}
      >
        <ProjectSection />
      </ProjectStructureContext.Provider>
      );
    };

    return render(<ProjectSectionWithContext />);
  };
  const openContextMenu = (name: string) => fireEvent.contextMenu(screen.getByRole('heading', { name }));

  test('selects an item and extends the selection with Ctrl or Cmd click', () => {
    const onAction = jest.fn<ProjectActionHandler>();
    renderProjectSection(
      onAction,
      [{ id: 1, items: [], name: 'Assets' }]
    );

    fireEvent.click(screen.getByRole('heading', { name: 'Initial project' }));
    fireEvent.click(screen.getByRole('heading', { name: 'Assets' }), { ctrlKey: true });
    fireEvent.click(screen.getByRole('heading', { name: 'Assets' }), { metaKey: true });

    expect(onAction).toHaveBeenNthCalledWith(1, 'select', AssetType.Project, 0, false);
    expect(onAction).toHaveBeenNthCalledWith(2, 'select', AssetType.ProjectFolder, 1, true);
    expect(onAction).toHaveBeenNthCalledWith(3, 'select', AssetType.ProjectFolder, 1, true);
  });

  test('shows a border beneath the item whose context menu is open', async () => {
    const user = userEvent.setup();
    renderProjectSection(jest.fn<ProjectActionHandler>());

    const projectItem = screen.getByRole('heading', { name: 'Initial project' }).closest('[data-project-item]');

    openContextMenu('Initial project');
    expect(projectItem).toHaveAttribute('data-menu-open', 'true');

    await user.keyboard('{Escape}');
    expect(projectItem).toHaveAttribute('data-menu-open', 'false');
  });

  test('closes an item context menu when it is right-clicked again', () => {
    const { container } = renderProjectSection(jest.fn<ProjectActionHandler>());

    const projectItem = container.querySelector('[data-project-item]');

    expect(projectItem).not.toBeNull();

    fireEvent.contextMenu(projectItem!);
    expect(projectItem).toHaveAttribute('data-menu-open', 'true');

    fireEvent.contextMenu(document.body);
    expect(projectItem).toHaveAttribute('data-menu-open', 'false');
  });

  test('renames the project with a trimmed name', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction);

    openContextMenu('Initial project');
    await user.click(screen.getByRole('menuitem', { name: 'common.rename' }));
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

    openContextMenu('Initial project');
    await user.click(screen.getByRole('menuitem', { name: 'common.rename' }));
    const input = screen.getByRole('textbox', { name: 'common.renameName' });
    await user.clear(input);
    await user.type(input, '   ');

    expect(screen.getByRole('button', { name: 'common.saveRename' })).toBeDisabled();
    expect(onAction).not.toHaveBeenCalled();
  });

  test('does not show a delete action for the project root', async () => {
    renderProjectSection(jest.fn<ProjectActionHandler>());
    openContextMenu('Initial project');

    expect(screen.queryByRole('menuitem', { name: 'common.delete' })).not.toBeInTheDocument();
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

    const assetsAccordion = screen.getByRole('button', { name: 'Assets' });

    expect(within(assetsAccordion).getByTestId('FolderIcon')).toBeInTheDocument();
    expect(within(assetsAccordion).getByTestId('ChevronRightIcon')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Images' })).not.toBeInTheDocument();

    await user.click(assetsAccordion);

    expect(within(assetsAccordion).getByTestId('ExpandMoreIcon')).toBeInTheDocument();
    expect(within(assetsAccordion).getByTestId('FolderIcon')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Images' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading')).toHaveLength(3);
  });

  test('expands an accordion with a single-selection click but not with Ctrl or Cmd selection', () => {
    const onAction = jest.fn<ProjectActionHandler>();
    renderProjectSection(
      onAction,
      [{ id: 1, items: [], name: 'Assets' }, { id: 2, items: [], name: 'Assets/Images' }]
    );
    const assetsAccordion = screen.getByRole('button', { name: 'Assets' });

    fireEvent.click(assetsAccordion, { ctrlKey: true });

    expect(screen.queryByRole('heading', { name: 'Images' })).not.toBeInTheDocument();
    expect(onAction).toHaveBeenCalledWith('select', AssetType.ProjectFolder, 1, true);

    fireEvent.click(assetsAccordion);

    expect(screen.getByRole('heading', { name: 'Images' })).toBeInTheDocument();
    expect(onAction).toHaveBeenLastCalledWith('select', AssetType.ProjectFolder, 1, false);
  });

  test('hides the expand icon when a folder no longer has children', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();
    const { rerender } = renderProjectSection(onAction, [
      { id: 1, items: [], name: 'Assets' },
      { id: 2, items: [], name: 'Assets/Images' }
    ]);
    const assetsAccordion = screen.getByRole('button', { name: 'Assets' });

    await user.click(assetsAccordion);
    expect(within(assetsAccordion).getByTestId('ExpandMoreIcon')).toBeInTheDocument();

    rerender(
      <ProjectStructureContext.Provider
        value={{
          expandedItemIds: [],
          onAction,
          project: {
            content: [{ data: null, id: 1, name: 'Assets', parentId: 0, type: AssetType.ProjectFolder, version: 0 }],
            name: 'Initial project',
            path: '/tmp/project'
          },
          selectedItems: [],
          setExpandedItemIds: jest.fn()
        }}
      >
        <ProjectSection />
      </ProjectStructureContext.Provider>
    );

    expect(screen.getByTestId('FolderIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('ExpandMoreIcon')).not.toBeInTheDocument();
    expect(screen.getByTestId('ChevronRightIcon')).toHaveClass('MuiSvgIcon-colorDisabled');
  });

  test('renders root folder bundles with their configured names', async () => {
    const user = userEvent.setup();
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
    openContextMenu('Main bundle');
    expect(screen.getByRole('menuitem', { name: 'bundleFolder.add' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'textureAtlas.add' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
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

    openContextMenu('default_bundle');
    await user.click(screen.getByRole('menuitem', { name: 'common.rename' }));
    const input = screen.getByRole('textbox', { name: 'common.renameName' });
    await user.clear(input);
    await user.type(input, 'Main bundle');
    await user.click(screen.getByRole('button', { name: 'common.saveRename' }));

    expect(onAction).toHaveBeenCalledWith('rename', AssetType.Bundle, 2, 'Main bundle');
  });

  test('dispatches delete for a non-project item', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn<ProjectActionHandler>();
    renderProjectSection(
      onAction,
      [{ id: 1, items: ['2'], name: '' }],
      [{ data: null, id: 2, name: 'default_bundle', parentId: 1, type: AssetType.Bundle, version: 0 }]
    );

    openContextMenu('default_bundle');
    await user.click(screen.getByRole('menuitem', { name: 'common.delete' }));

    expect(onAction).toHaveBeenCalledWith('delete', AssetType.Bundle, 2);
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

    await user.click(screen.getByRole('button', { name: 'default_bundle' }));

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

    openContextMenu('Initial project');
    await user.click(screen.getByRole('menuitem', { name: 'folder.add' }));

    expect(onAction).toHaveBeenCalledWith('add-folder', AssetType.Project, 0);
  });

  test('dispatches the add-bundle action from the project', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction);

    openContextMenu('Initial project');
    await user.click(screen.getByRole('menuitem', { name: 'bundle.add' }));

    expect(onAction).toHaveBeenCalledWith('add-bundle', AssetType.Project, 0);
  });

  test('dispatches the import action from the project root', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction);

    openContextMenu('Initial project');
    await user.click(screen.getByRole('menuitem', { name: 'common.import' }));

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

    openContextMenu('default_bundle');
    await user.click(screen.getByRole('menuitem', { name: 'common.import' }));

    expect(onAction).toHaveBeenCalledWith('import', AssetType.Bundle, 2);
  });

  test('dispatches the parent folder ID when adding a nested folder', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction, [{ id: 2, items: [], name: 'Assets' }, { id: 1, items: [], name: 'Assets/Images' }]);

    await user.click(screen.getByRole('button', { name: 'Assets' }));
    openContextMenu('Images');
    await user.click(screen.getByRole('menuitem', { name: 'folder.add' }));

    expect(onAction).toHaveBeenCalledWith('add-folder', AssetType.ProjectFolder, 1);
  });

  test('dispatches the parent folder ID when adding a bundle to a folder', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();

    renderProjectSection(onAction, [{ id: 2, items: [], name: 'Assets' }, { id: 1, items: [], name: 'Assets/Images' }]);

    await user.click(screen.getByRole('button', { name: 'Assets' }));
    openContextMenu('Images');
    await user.click(screen.getByRole('menuitem', { name: 'bundle.add' }));

    expect(onAction).toHaveBeenCalledWith('add-bundle', AssetType.ProjectFolder, 1);
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

    expect(onAction).toHaveBeenCalledWith('move', AssetType.ProjectFolder, 1, 2);
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

    expect(onAction).toHaveBeenCalledWith('move', AssetType.ProjectFolder, 1, 0);
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

    expect(onAction).toHaveBeenCalledWith('move', AssetType.Bundle, 2, 3);
    expect(onAction).toHaveBeenCalledWith('move', AssetType.Bundle, 2, 1);
  });

  test('moves bundle content to compatible bundle, bundle-folder, and atlas targets', async () => {
    const user = userEvent.setup();
    const onAction = jest
      .fn<(action: string, assetType: AssetType, id: number, data?: unknown) => Promise<void>>()
      .mockResolvedValue();
    const createDataTransfer = (type: string) => {
      const dragData = new Map<string, string>();

      return {
        dropEffect: '',
        effectAllowed: '',
        getData: (dragType: string) => dragData.get(dragType) ?? '',
        setData: (dragType: string, value: string) => dragData.set(dragType, value),
        types: [type]
      };
    };

    renderProjectSection(onAction, [], [
      { data: null, id: 1, name: '', parentId: 0, type: AssetType.ProjectFolder, version: 0 },
      { data: null, id: 2, name: 'Main', parentId: 1, type: AssetType.Bundle, version: 0 },
      { data: null, id: 3, name: 'Nested', parentId: 2, type: AssetType.Bundle, version: 0 },
      { data: null, id: 4, name: 'Source', parentId: 2, type: AssetType.BundleFolder, version: 0 },
      { data: null, id: 5, name: 'Target', parentId: 2, type: AssetType.BundleFolder, version: 0 },
      { data: null, id: 6, name: 'Characters', parentId: 2, type: AssetType.TextureAtlas, version: 0 },
      { data: null, id: 7, name: 'Hero', parentId: 2, type: AssetType.Image, version: 0 }
    ]);
    await user.click(screen.getByRole('button', { name: 'Main' }));

    const getItem = (name: string) => screen.getByRole('heading', { name }).closest('[draggable="true"]') as HTMLElement;
    const move = (sourceName: string, targetName: string, dragType: string) => {
      const dataTransfer = createDataTransfer(dragType);
      const source = getItem(sourceName);
      const target = getItem(targetName);

      fireEvent.dragStart(source, { dataTransfer });
      fireEvent.dragOver(target, { dataTransfer });
      fireEvent.drop(target, { dataTransfer });
    };

    move('Source', 'Target', 'application/x-manticore-bundle-folder');
    move('Nested', 'Main', 'application/x-manticore-project-bundle');
    move('Characters', 'Target', 'application/x-manticore-texture-atlas');
    move('Hero', 'Characters', 'application/x-manticore-image');

    expect(onAction).toHaveBeenCalledWith('move', AssetType.BundleFolder, 4, 5);
    expect(onAction).toHaveBeenCalledWith('move', AssetType.Bundle, 3, 2);
    expect(onAction).toHaveBeenCalledWith('move', AssetType.TextureAtlas, 6, 5);
    expect(onAction).toHaveBeenCalledWith('move', AssetType.Image, 7, 6);
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

    const assetsAccordion = screen.getByRole('button', { name: 'Assets' });
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

    openContextMenu('Assets');
    await user.click(screen.getByRole('menuitem', { name: 'common.rename' }));
    const input = screen.getByRole('textbox', { name: 'common.renameName' });
    await user.clear(input);
    await user.type(input, 'Resources');
    await user.click(screen.getByRole('button', { name: 'common.saveRename' }));

    expect(onAction).toHaveBeenCalledWith('rename', AssetType.ProjectFolder, 1, 'Resources');
  });
});
