import { describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AddRounded from '@mui/icons-material/AddRounded';

import WelcomeSection from '../WelcomeSection';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('WelcomeSection', () => {
  test('renders its title and dispatches configured actions', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();

    render(
      <WelcomeSection
        actions={[{ action: 'create-project', Icon: AddRounded, labelKey: 'section.action' }]}
        onAction={onAction}
        title="Section title"
      />
    );

    screen.getByRole('heading', { name: 'Section title' });
    await user.click(screen.getByRole('button', { name: 'section.action' }));

    expect(onAction).toHaveBeenCalledWith('create-project');
  });
});
