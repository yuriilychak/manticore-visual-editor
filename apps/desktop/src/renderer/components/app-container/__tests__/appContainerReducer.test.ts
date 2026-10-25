import { describe, expect, test } from '@jest/globals';

import { AssetType } from '../../../../types';

import { appContainerReducer, INITIAL_APP_CONTAINER_STATE } from '../appContainerReducer';

describe('appContainerReducer selection', () => {
  const createState = () => {
    const state = INITIAL_APP_CONTAINER_STATE;
    return appContainerReducer(state, { type: 'project-opened', payload: { assetType: AssetType.Project, id: 0, data: {
      content: [
        { id: 2, name: '01', parentId: 1, type: AssetType.ProjectFolder, version: 0 },
        { id: 3, name: '02', parentId: 1, type: AssetType.ProjectFolder, version: 0 },
        { id: 4, name: '03', parentId: 1, type: AssetType.ProjectFolder, version: 0 }
      ],
      name: 'Project',
      path: '/tmp/project'
    } } });
  };

  test('selects an inclusive Shift range from the selection anchor', () => {
    const initialState = createState();
    const selectedState = appContainerReducer(initialState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 2, isExtended: false, isRange: false }, id: 2 }
    });
    const rangeSelectedState = appContainerReducer(selectedState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 4, isExtended: false, isRange: true }, id: 4 }
    });

    expect(rangeSelectedState.selection).toEqual([2, 3, 4]);
    expect(rangeSelectedState.selectionAnchor).toBe(2);
  });

  test('adds a Shift range when Ctrl or Cmd is also held', () => {
    const initialState = createState();
    const selectedState = appContainerReducer(initialState, {
      type: 'select',
      payload: { assetType: AssetType.Project, data: { id: 0, isExtended: false, isRange: false }, id: 0 }
    });
    const rangeSelectedState = appContainerReducer(selectedState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 3, isExtended: true, isRange: true }, id: 3 }
    });

    expect(rangeSelectedState.selection).toEqual([0, 2, 3]);
  });

  test('preserves existing selections when extending with Shift', () => {
    const selectedState = appContainerReducer(createState(), {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 2, isExtended: false, isRange: false }, id: 2 }
    });
    const extendedState = appContainerReducer(selectedState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 4, isExtended: true, isRange: false }, id: 4 }
    });
    const rangeSelectedState = appContainerReducer(extendedState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 3, isExtended: false, isRange: true }, id: 3 }
    });

    expect(rangeSelectedState.selection).toEqual([2, 4, 3]);
  });

  test('keeps the final selected item when Ctrl or Cmd clicking it', () => {
    const selectedState = appContainerReducer(createState(), {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 2, isExtended: false, isRange: false }, id: 2 }
    });
    const extendedState = appContainerReducer(selectedState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 3, isExtended: true, isRange: false }, id: 3 }
    });
    const deselectedState = appContainerReducer(extendedState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 3, isExtended: true, isRange: false }, id: 3 }
    });
    const finalSelectionState = appContainerReducer(deselectedState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 2, isExtended: true, isRange: false }, id: 2 }
    });

    expect(deselectedState.selection).toEqual([2]);
    expect(finalSelectionState.selection).toEqual([2]);
  });

  test('selects every descendant when Ctrl or Cmd selecting an item with children', () => {
    const state = appContainerReducer(INITIAL_APP_CONTAINER_STATE, { type: 'project-opened', payload: { assetType: AssetType.Project, id: 0, data: {
      content: [
        { id: 2, name: 'Bundle', parentId: 1, type: AssetType.Bundle, version: 0 },
        { id: 3, name: 'Folder', parentId: 2, type: AssetType.BundleFolder, version: 0 },
        { id: 4, name: 'Image', parentId: 3, type: AssetType.Image, version: 0 },
        { id: 5, name: 'Other', parentId: 1, type: AssetType.Bundle, version: 0 }
      ],
      name: 'Project',
      path: '/tmp/project'
    } } });

    const initiallySelectedState = appContainerReducer(state, {
      type: 'select',
      payload: { assetType: AssetType.Bundle, data: { id: 5, isExtended: false, isRange: false }, id: 5 }
    });
    const selectedState = appContainerReducer(initiallySelectedState, {
      type: 'select',
      payload: { assetType: AssetType.Bundle, data: { id: 2, isExtended: true, isRange: false }, id: 2 }
    });

    expect(selectedState.selection).toEqual([5, 2, 3, 4]);
  });

  test('selects descendants of a previously selected parent when extending with Ctrl or Cmd', () => {
    const state = appContainerReducer(INITIAL_APP_CONTAINER_STATE, { type: 'project-opened', payload: { assetType: AssetType.Project, id: 0, data: {
      content: [
        { id: 2, name: 'Bundle', parentId: 1, type: AssetType.Bundle, version: 0 },
        { id: 3, name: 'Folder', parentId: 2, type: AssetType.BundleFolder, version: 0 },
        { id: 4, name: 'Image', parentId: 3, type: AssetType.Image, version: 0 },
        { id: 5, name: 'Other', parentId: 1, type: AssetType.Bundle, version: 0 }
      ],
      name: 'Project',
      path: '/tmp/project'
    } } });
    const initiallySelectedState = appContainerReducer(state, {
      type: 'select',
      payload: { assetType: AssetType.Bundle, data: { id: 2, isExtended: false, isRange: false }, id: 2 }
    });
    const extendedState = appContainerReducer(initiallySelectedState, {
      type: 'select',
      payload: { assetType: AssetType.Bundle, data: { id: 5, isExtended: true, isRange: false }, id: 5 }
    });

    expect(extendedState.selection).toEqual([2, 5, 3, 4]);
  });

  test('does not select descendants without Ctrl or Cmd', () => {
    const state = appContainerReducer(INITIAL_APP_CONTAINER_STATE, { type: 'project-opened', payload: { assetType: AssetType.Project, id: 0, data: {
      content: [
        { id: 2, name: 'Bundle', parentId: 1, type: AssetType.Bundle, version: 0 },
        { id: 3, name: 'Image', parentId: 2, type: AssetType.Image, version: 0 }
      ],
      name: 'Project',
      path: '/tmp/project'
    } } });

    const selectedState = appContainerReducer(state, {
      type: 'select',
      payload: { assetType: AssetType.Bundle, data: { id: 2, isExtended: false, isRange: false }, id: 2 }
    });

    expect(selectedState.selection).toEqual([2]);
  });

  test('deselects selected parents when deselecting one of their children', () => {
    const state = appContainerReducer(INITIAL_APP_CONTAINER_STATE, { type: 'project-opened', payload: { assetType: AssetType.Project, id: 0, data: {
      content: [
        { id: 2, name: 'Bundle', parentId: 1, type: AssetType.Bundle, version: 0 },
        { id: 3, name: 'First', parentId: 2, type: AssetType.Image, version: 0 },
        { id: 4, name: 'Second', parentId: 2, type: AssetType.Image, version: 0 },
        { id: 5, name: 'Other', parentId: 1, type: AssetType.Bundle, version: 0 }
      ],
      name: 'Project',
      path: '/tmp/project'
    } } });
    const initiallySelectedState = appContainerReducer(state, {
      type: 'select',
      payload: { assetType: AssetType.Bundle, data: { id: 5, isExtended: false, isRange: false }, id: 5 }
    });
    const selectedState = appContainerReducer(initiallySelectedState, {
      type: 'select',
      payload: { assetType: AssetType.Bundle, data: { id: 2, isExtended: true, isRange: false }, id: 2 }
    });
    const deselectedState = appContainerReducer(selectedState, {
      type: 'select',
      payload: { assetType: AssetType.Image, data: { id: 3, isExtended: true, isRange: false }, id: 3 }
    });

    expect(deselectedState.selection).toEqual([5, 4]);
  });

  test('deselects descendants when Ctrl or Cmd deselecting a selected parent', () => {
    const state = appContainerReducer(INITIAL_APP_CONTAINER_STATE, { type: 'project-opened', payload: { assetType: AssetType.Project, id: 0, data: {
      content: [
        { id: 2, name: 'Bundle', parentId: 1, type: AssetType.Bundle, version: 0 },
        { id: 3, name: 'Folder', parentId: 2, type: AssetType.BundleFolder, version: 0 },
        { id: 4, name: 'Image', parentId: 3, type: AssetType.Image, version: 0 },
        { id: 5, name: 'Other', parentId: 1, type: AssetType.Bundle, version: 0 }
      ],
      name: 'Project',
      path: '/tmp/project'
    } } });
    const initiallySelectedState = appContainerReducer(state, {
      type: 'select',
      payload: { assetType: AssetType.Bundle, data: { id: 5, isExtended: false, isRange: false }, id: 5 }
    });
    const selectedState = appContainerReducer(initiallySelectedState, {
      type: 'select',
      payload: { assetType: AssetType.Bundle, data: { id: 2, isExtended: true, isRange: false }, id: 2 }
    });
    const deselectedState = appContainerReducer(selectedState, {
      type: 'select',
      payload: { assetType: AssetType.Bundle, data: { id: 2, isExtended: true, isRange: false }, id: 2 }
    });

    expect(deselectedState.selection).toEqual([5]);
  });

  test('selects a parent after all of its children are selected', () => {
    const state = appContainerReducer(INITIAL_APP_CONTAINER_STATE, { type: 'project-opened', payload: { assetType: AssetType.Project, id: 0, data: {
      content: [
        { id: 2, name: 'Bundle', parentId: 1, type: AssetType.Bundle, version: 0 },
        { id: 3, name: 'First', parentId: 2, type: AssetType.Image, version: 0 },
        { id: 4, name: 'Second', parentId: 2, type: AssetType.Image, version: 0 }
      ],
      name: 'Project',
      path: '/tmp/project'
    } } });
    const firstSelectedState = appContainerReducer(state, {
      type: 'select',
      payload: { assetType: AssetType.Image, data: { id: 3, isExtended: false, isRange: false }, id: 3 }
    });
    const allSelectedState = appContainerReducer(firstSelectedState, {
      type: 'select',
      payload: { assetType: AssetType.Image, data: { id: 4, isExtended: true, isRange: false }, id: 4 }
    });

    expect(allSelectedState.selection).toEqual([3, 4, 2]);
  });
});

describe('appContainerReducer project proxy', () => {
  test('indexes content and bundle IDs in the project proxy', () => {
    const initialState = INITIAL_APP_CONTAINER_STATE;
    expect(initialState.projectName).toBe('');
    expect(initialState.projectPath).toBe('');

    const state = appContainerReducer(initialState, { type: 'project-opened', payload: { assetType: AssetType.Project, id: 0, data: {
      content: [
        { id: 1, name: 'Bundle', parentId: 0, type: AssetType.Bundle, version: 0 },
        { id: 2, name: 'Image', parentId: 1, type: AssetType.Image, version: 0 }
      ],
      name: 'Project',
      path: '/tmp/project'
    } } });

    expect(state.bundleIds).toEqual([1]);
    expect(state.childrenIdsByParentId[0]).toEqual([1]);
    expect(state.bundleIds[0]).toBe(1);
    expect(state.contentById[2]?.name).toBe('Image');
    expect(state.projectName).toBe('Project');
    expect(state.projectPath).toBe('/tmp/project');

    const renamedState = appContainerReducer(state, { type: 'project-renamed', payload: 'Renamed project' });
    expect(renamedState.projectName).toBe('Renamed project');
  });
});
