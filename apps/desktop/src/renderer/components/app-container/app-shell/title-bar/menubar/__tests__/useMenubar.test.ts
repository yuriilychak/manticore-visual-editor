import { describe, expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';

import { useMenubar } from '../useMenubar';

const createMouseEvent = (id: string) => {
  const currentTarget = document.createElement('button');
  currentTarget.dataset.id = id;

  return { currentTarget } as unknown as MouseEvent<HTMLElement>;
};

describe('useMenubar', () => {
  test('opens menus by id and closes them after dispatching an action', () => {
    const onAction = jest.fn();
    const { result } = renderHook(() => useMenubar(onAction, []));
    const fileMenuEvent = createMouseEvent('file');

    act(() => result.current.handlers.submenu(fileMenuEvent));

    expect(result.current.anchors.file).toBe(fileMenuEvent.currentTarget);

    act(() => result.current.handlers.action(createMouseEvent('create-project')));

    expect(onAction).toHaveBeenCalledWith('create-project');
    expect(result.current.anchors.file).toBeNull();
  });

  test('returns only top-level menu buttons', () => {
    const { result } = renderHook(() => useMenubar(jest.fn(), ['set-language-es']));

    expect(result.current.buttons.map(({ id }) => id)).toEqual(['file', 'help']);
    expect(result.current.getSelected('action', 'set-language-en')).toBe(false);
    expect(result.current.getSelected('action', 'set-language-es')).toBe(true);
    expect(result.current.getSelected('submenu', 'language')).toBe(false);
  });
});
