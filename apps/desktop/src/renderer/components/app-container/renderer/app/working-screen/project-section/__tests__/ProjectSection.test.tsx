import { describe, expect, jest,test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProjectSection from '../ProjectSection';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('ProjectSection', () => {
  test('renames the project with a trimmed name', async () => {
    const user = userEvent.setup();
    const onRename = jest.fn<(name: string) => Promise<void>>().mockResolvedValue();

    render(<ProjectSection name="Initial project" onRename={onRename} />);

    await user.click(screen.getByRole('button', { name: 'common.rename' }));
    const input = screen.getByRole('textbox', { name: 'common.renameName' });
    await user.clear(input);
    await user.type(input, '  Renamed project  ');
    await user.click(screen.getByRole('button', { name: 'common.saveRename' }));

    expect(onRename).toHaveBeenCalledWith('Renamed project');
    expect(screen.getByRole('heading', { name: 'Initial project' })).toBeInTheDocument();
  });

  test('does not allow an empty trimmed project name to be submitted', async () => {
    const user = userEvent.setup();
    const onRename = jest.fn<(name: string) => Promise<void>>().mockResolvedValue();

    render(<ProjectSection name="Initial project" onRename={onRename} />);

    await user.click(screen.getByRole('button', { name: 'common.rename' }));
    const input = screen.getByRole('textbox', { name: 'common.renameName' });
    await user.clear(input);
    await user.type(input, '   ');

    expect(screen.getByRole('button', { name: 'common.saveRename' })).toBeDisabled();
    expect(onRename).not.toHaveBeenCalled();
  });
});
