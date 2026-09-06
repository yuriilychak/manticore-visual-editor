import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { WindowControlAction } from '../../../../../types';

import TitleBar from '../TitleBar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { changeLanguage: jest.fn(), language: 'en' }, t: (key: string) => key })
}));

describe('TitleBar', () => {
  test('renders state-appropriate controls and forwards their actions', async () => {
    const user = userEvent.setup();
    const onWindowControl = jest.fn<(action: WindowControlAction) => Promise<void>>().mockResolvedValue(undefined);
    const { rerender } = render(
      <TitleBar
        isMaximized={false}
        onAction={jest.fn()}
        onWindowControl={onWindowControl}
        selectedActionIds={[]}
        showWindowControls
      />
    );

    screen.getByLabelText('Maximize window');
    expect(screen.queryByLabelText('Restore window')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Close window'));
    fireEvent.doubleClick(screen.getByAltText('Manticore Visual Editor'));

    expect(onWindowControl).toHaveBeenNthCalledWith(1, 'close');
    expect(onWindowControl).toHaveBeenNthCalledWith(2, 'toggle-maximize');

    rerender(
      <TitleBar
        isMaximized
        onAction={jest.fn()}
        onWindowControl={onWindowControl}
        selectedActionIds={[]}
        showWindowControls
      />
    );

    screen.getByLabelText('Restore window');
    expect(screen.queryByLabelText('Maximize window')).not.toBeInTheDocument();
  });
});
