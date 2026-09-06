import { describe, expect, jest, test } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';

import type { WindowControls } from '../../../../types';

import { useWindowControls } from '../useWindowControls';

describe('useWindowControls', () => {
  test('retrieves window state and dispatches supported actions', async () => {
    let onMaximizeChange: ((isMaximized: boolean) => void) | undefined;
    const controls: WindowControls = {
      close: jest.fn(async () => undefined),
      isMaximized: jest.fn(async () => false),
      minimize: jest.fn(async () => undefined),
      onMaximizeChange: jest.fn((listener: (isMaximized: boolean) => void) => {
        onMaximizeChange = listener;
        return jest.fn();
      }),
      toggleMaximize: jest.fn(async () => true)
    };
    const { result } = renderHook(() => useWindowControls(controls));

    await waitFor(() => expect(controls.isMaximized).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.onWindowControl('minimize');
      await result.current.onWindowControl('toggle-maximize');
      await result.current.onWindowControl('close');
      await result.current.onWindowControl('none');
    });

    expect(controls.minimize).toHaveBeenCalledTimes(1);
    expect(controls.toggleMaximize).toHaveBeenCalledTimes(1);
    expect(controls.close).toHaveBeenCalledTimes(1);
    expect(result.current.isMaximized).toBe(true);

    act(() => onMaximizeChange?.(false));

    expect(result.current.isMaximized).toBe(false);
  });
});
