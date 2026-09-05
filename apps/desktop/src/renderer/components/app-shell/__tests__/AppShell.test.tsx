import { describe, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import type { WindowControls } from '../../../types';

import AppShell from '../AppShell';

const WINDOW_CONTROLS: WindowControls = {
  close: jest.fn(async () => undefined),
  isMaximized: jest.fn(async () => false),
  minimize: jest.fn(async () => undefined),
  onMaximizeChange: jest.fn(() => jest.fn()),
  toggleMaximize: jest.fn(async () => false)
};

describe('AppShell', () => {
  test('renders window chrome around its children', () => {
    render(
      <AppShell controls={WINDOW_CONTROLS}>
        <div>Editor content</div>
      </AppShell>
    );

    screen.getByAltText('Manticore Visual Editor');
    screen.getByText('Editor content');
    screen.getByLabelText('Close window');
  });
});
