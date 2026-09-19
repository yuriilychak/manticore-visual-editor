import { describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NewFolderDialog from '../NewFolderDialog';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('NewFolderDialog', () => {
  test('prevents creating a folder with a duplicate name at the current level', async () => {
    const user = userEvent.setup();
    const onCreate = jest.fn<(name: string) => Promise<void>>().mockResolvedValue();

    render(<NewFolderDialog existingFolderNames={['Assets']} onClose={jest.fn()} onCreate={onCreate} open />);

    await user.type(screen.getByRole('textbox', { name: 'folder.name' }), 'Assets');

    expect(screen.getByText('folder.alreadyExists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'folder.create' })).toBeDisabled();
  });
});
