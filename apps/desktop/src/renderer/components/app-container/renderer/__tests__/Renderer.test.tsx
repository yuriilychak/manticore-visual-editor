import { beforeEach, describe, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockInitializeI18n = jest.fn<() => Promise<void>>();

jest.mock('../../../../i18n', () => ({ initializeI18n: mockInitializeI18n }));
jest.mock('../app', () => ({ App: () => <div>Application ready</div> }));
jest.mock('../splash-screen', () => ({
  SplashScreen: ({ hasError, onRetry }: { hasError?: boolean; onRetry?: () => void }) =>
    hasError ? <button onClick={onRetry}>Retry</button> : <div>Loading application</div>
}));

import Renderer from '../Renderer';

describe('Renderer', () => {
  beforeEach(() => {
    mockInitializeI18n.mockReset();
  });

  test('shows the application after localization initialization', async () => {
    mockInitializeI18n.mockResolvedValue(undefined);

    render(<Renderer onAction={jest.fn()} projectPath="" />);

    await screen.findByText('Application ready');
  });

  test('retries localization initialization after an error', async () => {
    mockInitializeI18n.mockRejectedValueOnce(new Error('Locale unavailable')).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<Renderer onAction={jest.fn()} projectPath="" />);

    await screen.findByRole('button', { name: 'Retry' });
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await screen.findByText('Application ready');
  });
});
