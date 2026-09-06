import { useCallback, useEffect, useState } from 'react';

import type { WindowControlAction, WindowControls } from '../../../types';

export function useWindowControls(controls: WindowControls) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    void controls.isMaximized().then(setIsMaximized);
  }, [controls]);

  useEffect(() => controls.onMaximizeChange(setIsMaximized), [controls]);

  const onWindowControl = useCallback(
    async (action: WindowControlAction) => {
      switch (action) {
        case 'none':
          break;
        case 'minimize':
          await controls.minimize();
          break;
        case 'toggle-maximize':
          setIsMaximized(await controls.toggleMaximize());
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
