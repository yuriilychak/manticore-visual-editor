import { describe, expect, test } from '@jest/globals';

import { AssetType } from '../../../../types';

import { appContainerReducer, createInitialAppContainerState } from '../appContainerReducer';

describe('appContainerReducer selection', () => {
  const createState = () => {
    const state = createInitialAppContainerState();
    return appContainerReducer(state, { type: 'project-changed', payload: {
      content: [
        { id: 1, name: '01', parentId: 0, type: AssetType.ProjectFolder, version: 0 },
        { id: 2, name: '02', parentId: 0, type: AssetType.ProjectFolder, version: 0 },
        { id: 3, name: '03', parentId: 0, type: AssetType.ProjectFolder, version: 0 }
      ],
      name: 'Project',
      path: '/tmp/project'
    } });
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
