import { describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SplashScreen from '../SplashScreen';

describe('SplashScreen', () => {
  test('renders a loading indicator', () => {
    render(<SplashScreen />);

    screen.getByLabelText('Loading application');
    screen.getByText('Loading Manticore…');
  });

  test('shows a retry action after a localization failure', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();

    render(<SplashScreen hasError onRetry={onRetry} />);

    screen.getByText('Could not load the application language.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
