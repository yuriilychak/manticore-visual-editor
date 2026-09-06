import { describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Menubar from '../Menubar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string) => {
      const translations: Record<string, string> = {
        'menu.file.createFile': 'Create File',
        'menu.file.createProject': 'Create New Project',
        'menu.file.importFile': 'Import File',
        'menu.file.label': 'File',
        'menu.help.label': 'Help',
        'menu.help.language': 'Language',
        'menu.help.languages.english': 'English',
        'menu.help.languages.spanish': 'Spanish'
      };

      return translations[key];
    }
  })
}));

describe('Menubar', () => {
  test('shows configured File menu items and dispatches their action', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();

    render(<Menubar onAction={onAction} selectedActionIds={[]} />);

    await user.click(screen.getByRole('button', { name: 'File' }));

    screen.getByRole('menuitem', { name: 'Create File' });
    screen.getByRole('menuitem', { name: 'Import File' });
    await user.click(screen.getByRole('menuitem', { name: 'Create New Project' }));

    expect(onAction).toHaveBeenCalledWith('create-project');
  });

  test('dispatches language selection from the Language submenu', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();

    render(<Menubar onAction={onAction} selectedActionIds={[]} />);

    await user.click(screen.getByRole('button', { name: 'Help' }));
    await user.click(screen.getByRole('menuitem', { name: 'Language' }));
    await user.click(screen.getByRole('menuitem', { name: 'Spanish' }));

    expect(onAction).toHaveBeenCalledWith('set-language-es');
  });
});
