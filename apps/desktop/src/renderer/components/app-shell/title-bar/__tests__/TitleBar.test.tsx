import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { WindowControlAction } from '../../../../types';

import TitleBar from '../TitleBar';

describe('TitleBar', () => {
  test('renders state-appropriate controls and forwards their actions', async () => {
    const user = userEvent.setup();
    const onWindowControl = jest.fn<(action: WindowControlAction) => Promise<void>>().mockResolvedValue(undefined);
    const { rerender } = render(<TitleBar isMaximized={false} onWindowControl={onWindowControl} showWindowControls />);

    screen.getByLabelText('Maximize window');
    expect(screen.queryByLabelText('Restore window')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Close window'));
    fireEvent.doubleClick(screen.getByAltText('Manticore Visual Editor'));

    expect(onWindowControl).toHaveBeenNthCalledWith(1, 'close');
    expect(onWindowControl).toHaveBeenNthCalledWith(2, 'toggle-maximize');

    rerender(<TitleBar isMaximized onWindowControl={onWindowControl} showWindowControls />);

    screen.getByLabelText('Restore window');
    expect(screen.queryByLabelText('Maximize window')).not.toBeInTheDocument();
  });
});
