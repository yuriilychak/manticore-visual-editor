import { useCallback, useEffect, useState } from 'react';

import type { WindowControlAction, WindowControls } from '../../../types';

export function useWindowControls(controls: WindowControls) {
  const [isMaximized, setMaximized] = useState(false);

  useEffect(() => {
    void controls.isMaximized().then(setMaximized);
  }, [controls]);

  useEffect(() => controls.onMaximizeChange(setMaximized), [controls]);

  const onWindowControl = useCallback(
    async (action: WindowControlAction) => {
      switch (action) {
        case 'none':
          break;
        case 'minimize':
          await controls.minimize();
          break;
        case 'toggle-maximize':
          setMaximized(await controls.toggleMaximize());
          break;
        case 'close':
          await controls.close();
          break;
      }
    },
    [controls]
  );

  return { isMaximized, onWindowControl };
}
