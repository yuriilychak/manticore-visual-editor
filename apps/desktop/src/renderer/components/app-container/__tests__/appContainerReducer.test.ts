import { describe, expect, test } from '@jest/globals';

import { AssetType } from '../../../../types';

import { appContainerReducer, INITIAL_APP_CONTAINER_STATE } from '../appContainerReducer';

describe('appContainerReducer selection', () => {
  const createState = () => {
    const state = INITIAL_APP_CONTAINER_STATE;
    return appContainerReducer(state, { type: 'project-opened', payload: { assetType: AssetType.Project, id: 0, data: {
      content: [
        { id: 1, name: '01', parentId: 0, type: AssetType.ProjectFolder, version: 0 },
        { id: 2, name: '02', parentId: 0, type: AssetType.ProjectFolder, version: 0 },
        { id: 3, name: '03', parentId: 0, type: AssetType.ProjectFolder, version: 0 }
      ],
      name: 'Project',
      path: '/tmp/project'
    } } });
  };

  test('selects an inclusive Shift range from the selection anchor', () => {
    const initialState = createState();
    const selectedState = appContainerReducer(initialState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 1, isExtended: false, isRange: false }, id: 1 }
    });
    const rangeSelectedState = appContainerReducer(selectedState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 3, isExtended: false, isRange: true }, id: 3 }
    });

    expect(rangeSelectedState.selection).toEqual([1, 2, 3]);
    expect(rangeSelectedState.selectionAnchor).toBe(1);
  });

  test('adds a Shift range when Ctrl or Cmd is also held', () => {
    const initialState = createState();
    const selectedState = appContainerReducer(initialState, {
      type: 'select',
      payload: { assetType: AssetType.Project, data: { id: 0, isExtended: false, isRange: false }, id: 0 }
    });
    const rangeSelectedState = appContainerReducer(selectedState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 2, isExtended: true, isRange: true }, id: 2 }
    });

    expect(rangeSelectedState.selection).toEqual([0, 1, 2]);
  });

  test('preserves existing selections when extending with Shift', () => {
    const selectedState = appContainerReducer(createState(), {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 1, isExtended: false, isRange: false }, id: 1 }
    });
    const extendedState = appContainerReducer(selectedState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 3, isExtended: true, isRange: false }, id: 3 }
    });
    const rangeSelectedState = appContainerReducer(extendedState, {
      type: 'select',
      payload: { assetType: AssetType.ProjectFolder, data: { id: 2, isExtended: false, isRange: true }, id: 2 }
    });

    expect(rangeSelectedState.selection).toEqual([1, 3, 2]);
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
